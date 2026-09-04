import { describe, expect, it } from "vitest";
import {
  effectiveStatus,
  gracePeriodDaysFromEnv,
  graceDaysRemaining,
  hasPlatformAccess,
  resolveGracePeriodEnd,
  toInternalStatus,
} from "../status";

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-09-04T12:00:00.000Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY);

describe("toInternalStatus", () => {
  it("treats active and trialing as paid up", () => {
    expect(toInternalStatus("active")).toBe("ACTIVE");
    expect(toInternalStatus("trialing")).toBe("ACTIVE");
  });

  it("gives failed payments a margin", () => {
    expect(toInternalStatus("past_due")).toBe("PAST_DUE");
    expect(toInternalStatus("incomplete")).toBe("PAST_DUE");
  });

  it("pauses when Stripe has stopped trying", () => {
    expect(toInternalStatus("unpaid")).toBe("PAUSED");
    expect(toInternalStatus("paused")).toBe("PAUSED");
  });

  it("recognises the terminal states", () => {
    expect(toInternalStatus("canceled")).toBe("CANCELED");
    expect(toInternalStatus("incomplete_expired")).toBe("CANCELED");
  });

  it("never locks anyone out over a status it does not know", () => {
    expect(toInternalStatus("something_new")).toBe("PAST_DUE");
    expect(toInternalStatus(null)).toBe("PAST_DUE");
    expect(toInternalStatus(undefined)).toBe("PAST_DUE");
  });
});

describe("resolveGracePeriodEnd", () => {
  const base = { previousInternalStatus: null, previousGracePeriodEnd: null, failedAt: T0, graceDays: 7 };

  it("starts the clock at the failed payment", () => {
    const end = resolveGracePeriodEnd({ ...base, internalStatus: "PAST_DUE" });
    expect(end).toBe(at(7).toISOString());
  });

  it("does not extend the deadline on Stripe's retries", () => {
    const first = at(7).toISOString();
    const end = resolveGracePeriodEnd({
      internalStatus: "PAST_DUE",
      previousInternalStatus: "PAST_DUE",
      previousGracePeriodEnd: first,
      failedAt: at(3), // a later retry event
      graceDays: 7,
    });
    expect(end).toBe(first);
  });

  it("clears the deadline on recovery, so the next failure starts fresh", () => {
    expect(
      resolveGracePeriodEnd({
        internalStatus: "ACTIVE",
        previousInternalStatus: "PAST_DUE",
        previousGracePeriodEnd: at(7).toISOString(),
        failedAt: T0,
        graceDays: 7,
      }),
    ).toBeNull();
  });

  it("clears the deadline when pausing or cancelling", () => {
    expect(resolveGracePeriodEnd({ ...base, internalStatus: "PAUSED" })).toBeNull();
    expect(resolveGracePeriodEnd({ ...base, internalStatus: "CANCELED" })).toBeNull();
  });

  it("honours a custom number of days", () => {
    expect(resolveGracePeriodEnd({ ...base, internalStatus: "PAST_DUE", graceDays: 0 })).toBe(T0.toISOString());
    expect(resolveGracePeriodEnd({ ...base, internalStatus: "PAST_DUE", graceDays: 14 })).toBe(at(14).toISOString());
  });
});

describe("effectiveStatus", () => {
  const pastDue = { internal_status: "PAST_DUE", status: "past_due", grace_period_ends_at: at(7).toISOString() };

  it("keeps access inside the margin", () => {
    expect(effectiveStatus(pastDue, at(6.9))).toBe("PAST_DUE");
    expect(hasPlatformAccess(effectiveStatus(pastDue, at(6.9)))).toBe(true);
  });

  it("pauses the moment the margin runs out, with no event to trigger it", () => {
    expect(effectiveStatus(pastDue, at(7.1))).toBe("PAUSED");
    expect(hasPlatformAccess(effectiveStatus(pastDue, at(7.1)))).toBe(false);
  });

  it("is exclusive at the boundary", () => {
    expect(effectiveStatus(pastDue, at(7))).toBe("PAUSED");
  });

  it("passes the other states through untouched", () => {
    expect(effectiveStatus({ internal_status: "ACTIVE", status: "active" }, T0)).toBe("ACTIVE");
    expect(effectiveStatus({ internal_status: "PAUSED", status: "unpaid" }, T0)).toBe("PAUSED");
    expect(effectiveStatus({ internal_status: "CANCELED", status: "canceled" }, T0)).toBe("CANCELED");
  });

  it("falls back to the Stripe status on a row written before the migration", () => {
    expect(effectiveStatus({ status: "active" }, T0)).toBe("ACTIVE");
    expect(effectiveStatus({ internal_status: null, status: "canceled" }, T0)).toBe("CANCELED");
    expect(effectiveStatus({ internal_status: "NONSENSE", status: "active" }, T0)).toBe("ACTIVE");
  });

  it("fails closed on a missing row or a hand-edited one with no deadline", () => {
    expect(effectiveStatus(null, T0)).toBe("PAUSED");
    expect(effectiveStatus({ internal_status: "PAST_DUE", grace_period_ends_at: null }, T0)).toBe("PAUSED");
    expect(effectiveStatus({ internal_status: "PAST_DUE", grace_period_ends_at: "not a date" }, T0)).toBe("PAUSED");
  });
});

describe("graceDaysRemaining", () => {
  it("rounds up and never goes negative", () => {
    expect(graceDaysRemaining(at(7).toISOString(), T0)).toBe(7);
    expect(graceDaysRemaining(at(0.1).toISOString(), T0)).toBe(1);
    expect(graceDaysRemaining(at(-3).toISOString(), T0)).toBe(0);
    expect(graceDaysRemaining(null, T0)).toBe(0);
    expect(graceDaysRemaining("not a date", T0)).toBe(0);
  });
});

describe("gracePeriodDaysFromEnv", () => {
  it("defaults to 7", () => {
    expect(gracePeriodDaysFromEnv({})).toBe(7);
    expect(gracePeriodDaysFromEnv({ BILLING_GRACE_PERIOD_DAYS: "  " })).toBe(7);
  });

  it("reads a valid override", () => {
    expect(gracePeriodDaysFromEnv({ BILLING_GRACE_PERIOD_DAYS: "14" })).toBe(14);
    expect(gracePeriodDaysFromEnv({ BILLING_GRACE_PERIOD_DAYS: "0" })).toBe(0);
  });

  it("falls back rather than producing an invalid deadline", () => {
    expect(gracePeriodDaysFromEnv({ BILLING_GRACE_PERIOD_DAYS: "siete" })).toBe(7);
    expect(gracePeriodDaysFromEnv({ BILLING_GRACE_PERIOD_DAYS: "-1" })).toBe(7);
    expect(gracePeriodDaysFromEnv({ BILLING_GRACE_PERIOD_DAYS: "3.5" })).toBe(7);
  });
});
