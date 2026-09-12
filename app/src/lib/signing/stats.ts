/**
 * The signing numbers, computed from plain contract rows.
 *
 * Kept free of database and server imports so the arithmetic can be tested on
 * its own — these figures are what the school will judge the process by, and
 * a median that quietly drifts is worse than no median at all.
 */

export type ContractStatus = "issued" | "pending_signature" | "signed_by_student" | "countersigned" | "voided";

export interface SigningRow {
  id: string;
  contractNumber: string;
  studentName: string;
  className: string;
  status: ContractStatus;
  sentAt: string | null;
  studentSignedAt: string | null;
  countersignedAt: string | null;
  countersignedByName: string | null;
  linkExpiresAt: string | null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** Share of the first stage, 0-1. The bar's length. */
  shareOfStart: number;
  /** Share of the stage before it, 0-1. Null for the first stage. */
  conversion: number | null;
}

/**
 * Where contracts are in the signing process.
 *
 * Each stage counts every contract that has *reached* it, so the stages only
 * ever shrink — a countersigned contract is also a signed one. Voided
 * contracts are left out entirely: they are not stalled, they are cancelled.
 */
export function buildFunnel(rows: SigningRow[]): FunnelStage[] {
  const live = rows.filter((r) => r.status !== "voided");

  const counts = [
    { key: "issued", label: "Issued", count: live.length },
    { key: "sent", label: "Sent to student", count: live.filter((r) => r.sentAt).length },
    { key: "signed", label: "Signed by student", count: live.filter((r) => r.studentSignedAt).length },
    { key: "countersigned", label: "Fully executed", count: live.filter((r) => r.countersignedAt).length },
  ];

  const start = counts[0].count;
  return counts.map((stage, i) => ({
    ...stage,
    shareOfStart: start ? stage.count / start : 0,
    conversion: i === 0 ? null : counts[i - 1].count ? stage.count / counts[i - 1].count : 0,
  }));
}

export interface Duration {
  /** Hours. Null when nothing has completed this step yet. */
  median: number | null;
  average: number | null;
  count: number;
}

function summarise(hours: number[]): Duration {
  if (!hours.length) return { median: null, average: null, count: 0 };

  const sorted = [...hours].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  // The median is reported alongside the average on purpose: one contract that
  // sat unsigned over a holiday drags the average and leaves the median alone.
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;

  return {
    median,
    average: sorted.reduce((sum, h) => sum + h, 0) / sorted.length,
    count: sorted.length,
  };
}

function hoursBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / HOUR;
}

/** How long students take to sign once the request reaches them. */
export function timeToSign(rows: SigningRow[]): Duration {
  return summarise(
    rows
      .filter((r) => r.sentAt && r.studentSignedAt)
      .map((r) => hoursBetween(r.sentAt!, r.studentSignedAt!))
      .filter((h) => h >= 0),
  );
}

/** How long the school then takes to countersign. */
export function timeToCountersign(rows: SigningRow[]): Duration {
  return summarise(
    rows
      .filter((r) => r.studentSignedAt && r.countersignedAt)
      .map((r) => hoursBetween(r.studentSignedAt!, r.countersignedAt!))
      .filter((h) => h >= 0),
  );
}

export interface AgeBucket {
  label: string;
  count: number;
  /** Worse buckets carry more weight when the queue is triaged. */
  tone: "ok" | "warning" | "serious";
}

/**
 * Splits a waiting queue by how long it has been waiting.
 *
 * The boundaries are deliberately coarse: the useful question is "is anything
 * rotting", not "is this 61 or 62 hours old".
 */
export function bucketByAge(rows: SigningRow[], since: (row: SigningRow) => string | null, now: number): AgeBucket[] {
  const buckets: AgeBucket[] = [
    { label: "Under a day", count: 0, tone: "ok" },
    { label: "1–3 days", count: 0, tone: "ok" },
    { label: "3–7 days", count: 0, tone: "warning" },
    { label: "Over a week", count: 0, tone: "serious" },
  ];

  for (const row of rows) {
    const from = since(row);
    if (!from) continue;

    const age = now - new Date(from).getTime();
    if (age < DAY) buckets[0].count += 1;
    else if (age < 3 * DAY) buckets[1].count += 1;
    else if (age < 7 * DAY) buckets[2].count += 1;
    else buckets[3].count += 1;
  }

  return buckets;
}

/**
 * Signing links that ran out before the student used them.
 *
 * Counted against every contract that was ever sent, because that is the
 * question being asked: of the requests that went out, how many went stale?
 */
export function expiredLinks(rows: SigningRow[], now: number): { expired: number; sent: number; rate: number } {
  const sent = rows.filter((r) => r.sentAt && r.status !== "voided");
  const expired = sent.filter(
    (r) => r.status === "pending_signature" && r.linkExpiresAt && new Date(r.linkExpiresAt).getTime() < now,
  );

  return { expired: expired.length, sent: sent.length, rate: sent.length ? expired.length / sent.length : 0 };
}

/** "3h", "2d 4h" — durations people can read at a glance. */
export function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;

  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}
