// The app's own subscription vocabulary, deliberately separate from Stripe's.
//
// Stripe has eight statuses, several of which mean the same thing to us and
// one of which ("paused") means something different from what it sounds like.
// Everything downstream — the gate, the banner, /payment-required — reads the
// four states below and never a raw Stripe string.
//
// Every function here is pure: no clock, no environment, no I/O. The clock
// arrives as an argument so the transitions are testable, and the one function
// that does read the environment (gracePeriodDaysFromEnv) does nothing else.

export type InternalStatus = "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELED";

export const INTERNAL_STATUSES = ["ACTIVE", "PAST_DUE", "PAUSED", "CANCELED"] as const;

/** Days of continued access after the first failed payment. Overridable with
 *  BILLING_GRACE_PERIOD_DAYS. */
export const DEFAULT_GRACE_PERIOD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isInternalStatus(value: unknown): value is InternalStatus {
  return typeof value === "string" && (INTERNAL_STATUSES as readonly string[]).includes(value);
}

/**
 * Stripe status → our status.
 *
 * - `trialing` is as good as paid.
 * - `incomplete` is a first payment that failed; it gets the same margin as a
 *   later failure rather than a closed door.
 * - `unpaid` means Stripe has exhausted every retry and will not try again, so
 *   there is nothing left to wait for: it pauses immediately.
 * - `paused` is the trial-ended-without-a-payment-method state. It is NOT the
 *   same as `pause_collection`, which leaves the status untouched (usually
 *   `active`) and therefore keeps access on — that is a billing courtesy the
 *   seller granted, not a customer problem.
 * - Anything unrecognised is treated as a payment problem with a margin, never
 *   as an instant lockout.
 */
export function toInternalStatus(stripeStatus: string | null | undefined): InternalStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "incomplete":
      return "PAST_DUE";
    case "unpaid":
    case "paused":
      return "PAUSED";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "PAST_DUE";
  }
}

/**
 * Where the grace period ends, given the state the row is moving into.
 *
 * The clock starts at the first failed payment and does not restart on Stripe's
 * retries: while we are already PAST_DUE the existing deadline is kept, so four
 * retry events over five days do not buy twenty extra days. Any state other
 * than PAST_DUE clears the deadline, which is what makes recovery automatic —
 * a successful payment wipes it and the next failure starts a fresh margin.
 */
export function resolveGracePeriodEnd(input: {
  internalStatus: InternalStatus;
  previousInternalStatus: InternalStatus | null;
  previousGracePeriodEnd: string | null;
  failedAt: Date;
  graceDays: number;
}): string | null {
  const { internalStatus, previousInternalStatus, previousGracePeriodEnd, failedAt, graceDays } = input;

  if (internalStatus !== "PAST_DUE") return null;
  if (previousInternalStatus === "PAST_DUE" && previousGracePeriodEnd) return previousGracePeriodEnd;

  return new Date(failedAt.getTime() + graceDays * DAY_MS).toISOString();
}

export type SubscriptionStateRow = {
  internal_status?: string | null;
  status?: string | null;
  grace_period_ends_at?: string | null;
};

/**
 * The status as of `now`, which is not always the status stored in the row.
 *
 * PAST_DUE turns into PAUSED the moment the grace period runs out. That
 * transition has no event behind it — nothing arrives from Stripe when a
 * deadline simply passes — so it is computed on every read instead of by a
 * scheduled job. Vercel Hobby has no business depending on cron for this.
 *
 * `internal_status` may be missing on a row written before the billing state
 * migration; the raw Stripe status is the fallback so a code deploy that lands
 * ahead of the migration degrades to the old behaviour instead of throwing.
 */
export function effectiveStatus(row: SubscriptionStateRow | null | undefined, now: Date = new Date()): InternalStatus {
  // No row at all (missing, or unreadable) is a closed door for staff, exactly
  // as it was before internal statuses existed. Admins bypass the gate anyway.
  if (!row) return "PAUSED";

  const base = isInternalStatus(row.internal_status) ? row.internal_status : toInternalStatus(row.status);
  if (base !== "PAST_DUE") return base;

  const endsAt = row.grace_period_ends_at ? new Date(row.grace_period_ends_at) : null;
  // PAST_DUE without a deadline can only come from a hand-edited row. Fail
  // closed: the webhook always writes both fields in the same statement.
  if (!endsAt || Number.isNaN(endsAt.getTime())) return "PAUSED";

  return now.getTime() < endsAt.getTime() ? "PAST_DUE" : "PAUSED";
}

/** Whether non-admin users may use the app. PAST_DUE still works — that is the
 *  whole point of the grace period. */
export function hasPlatformAccess(status: InternalStatus): boolean {
  return status === "ACTIVE" || status === "PAST_DUE";
}

/** Whole days left in the margin, rounded up, never negative. 0 means it ends
 *  today. */
export function graceDaysRemaining(gracePeriodEndsAt: string | null | undefined, now: Date = new Date()): number {
  if (!gracePeriodEndsAt) return 0;
  const endsAt = new Date(gracePeriodEndsAt);
  if (Number.isNaN(endsAt.getTime())) return 0;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS));
}

/** BILLING_GRACE_PERIOD_DAYS, or 7. A malformed value falls back rather than
 *  producing an Invalid Date deadline. */
export function gracePeriodDaysFromEnv(env: Record<string, string | undefined> = process.env): number {
  const raw = env.BILLING_GRACE_PERIOD_DAYS?.trim();
  if (!raw) return DEFAULT_GRACE_PERIOD_DAYS;

  const days = Number(raw);
  if (!Number.isInteger(days) || days < 0) {
    console.warn(`BILLING_GRACE_PERIOD_DAYS="${raw}" is not a non-negative integer; using ${DEFAULT_GRACE_PERIOD_DAYS}`);
    return DEFAULT_GRACE_PERIOD_DAYS;
  }

  return days;
}
