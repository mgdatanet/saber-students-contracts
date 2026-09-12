import { describe, expect, it } from "vitest";
import {
  bucketByAge,
  buildFunnel,
  expiredLinks,
  formatHours,
  timeToCountersign,
  timeToSign,
  type SigningRow,
} from "../signing/stats";

const NOW = new Date("2026-09-12T12:00:00Z").getTime();
const at = (iso: string) => new Date(iso).toISOString();

function row(overrides: Partial<SigningRow> & Pick<SigningRow, "id" | "status">): SigningRow {
  return {
    contractNumber: `SC-${overrides.id}`,
    studentName: "Test Student",
    className: "RS 07-13-2026",
    sentAt: null,
    studentSignedAt: null,
    countersignedAt: null,
    countersignedByName: null,
    linkExpiresAt: null,
    ...overrides,
  };
}

describe("buildFunnel", () => {
  it("counts every stage a contract has reached, not just the one it sits in", () => {
    const rows = [
      row({ id: "1", status: "issued" }),
      row({ id: "2", status: "pending_signature", sentAt: at("2026-09-10T12:00:00Z") }),
      row({
        id: "3",
        status: "countersigned",
        sentAt: at("2026-09-09T12:00:00Z"),
        studentSignedAt: at("2026-09-09T14:00:00Z"),
        countersignedAt: at("2026-09-10T14:00:00Z"),
      }),
    ];

    const [issued, sent, signed, executed] = buildFunnel(rows);
    expect(issued.count).toBe(3);
    expect(sent.count).toBe(2);
    // The countersigned contract still counts as signed.
    expect(signed.count).toBe(1);
    expect(executed.count).toBe(1);

    expect(sent.conversion).toBeCloseTo(2 / 3);
    expect(executed.conversion).toBe(1);
    expect(issued.conversion).toBeNull();
  });

  it("leaves voided contracts out — they are cancelled, not stalled", () => {
    const rows = [row({ id: "1", status: "issued" }), row({ id: "2", status: "voided" })];
    expect(buildFunnel(rows)[0].count).toBe(1);
  });

  it("reports zeroes rather than dividing by zero when nothing is issued", () => {
    expect(buildFunnel([]).every((s) => s.count === 0 && s.shareOfStart === 0)).toBe(true);
  });
});

describe("time to sign", () => {
  it("takes the median of an even count as the midpoint of the middle pair", () => {
    const rows = [2, 4, 6, 100].map((hours, i) =>
      row({
        id: String(i),
        status: "countersigned",
        sentAt: at("2026-09-01T00:00:00Z"),
        studentSignedAt: new Date(Date.parse("2026-09-01T00:00:00Z") + hours * 3600_000).toISOString(),
      }),
    );

    const result = timeToSign(rows);
    expect(result.count).toBe(4);
    expect(result.median).toBe(5);
    // The outlier moves the average and leaves the median alone — the whole
    // reason both are reported.
    expect(result.average).toBe(28);
  });

  it("ignores contracts that have not reached the step yet", () => {
    expect(timeToSign([row({ id: "1", status: "pending_signature", sentAt: at("2026-09-01T00:00:00Z") })]).median).toBeNull();
  });

  it("measures countersigning from the student's signature, not from sending", () => {
    const rows = [
      row({
        id: "1",
        status: "countersigned",
        sentAt: at("2026-09-01T00:00:00Z"),
        studentSignedAt: at("2026-09-03T00:00:00Z"),
        countersignedAt: at("2026-09-03T06:00:00Z"),
      }),
    ];
    expect(timeToCountersign(rows).median).toBe(6);
  });
});

describe("bucketByAge", () => {
  it("files each wait into exactly one bucket", () => {
    const rows = [
      row({ id: "1", status: "pending_signature", sentAt: at("2026-09-12T06:00:00Z") }), // 6h
      row({ id: "2", status: "pending_signature", sentAt: at("2026-09-10T12:00:00Z") }), // 2d
      row({ id: "3", status: "pending_signature", sentAt: at("2026-09-07T12:00:00Z") }), // 5d
      row({ id: "4", status: "pending_signature", sentAt: at("2026-08-20T12:00:00Z") }), // 23d
    ];

    const buckets = bucketByAge(rows, (r) => r.sentAt, NOW);
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1, 1]);
    expect(buckets[3].tone).toBe("serious");
  });
});

describe("expiredLinks", () => {
  it("counts stale requests against everything that was sent", () => {
    const rows = [
      row({ id: "1", status: "pending_signature", sentAt: at("2026-08-01T00:00:00Z"), linkExpiresAt: at("2026-08-08T00:00:00Z") }),
      row({ id: "2", status: "pending_signature", sentAt: at("2026-09-11T00:00:00Z"), linkExpiresAt: at("2026-09-18T00:00:00Z") }),
      row({ id: "3", status: "countersigned", sentAt: at("2026-09-01T00:00:00Z"), studentSignedAt: at("2026-09-01T02:00:00Z") }),
      row({ id: "4", status: "issued" }),
    ];

    const result = expiredLinks(rows, NOW);
    expect(result.sent).toBe(3);
    expect(result.expired).toBe(1);
    expect(result.rate).toBeCloseTo(1 / 3);
  });
});

describe("formatHours", () => {
  it("reads the way a person would say it", () => {
    expect(formatHours(null)).toBe("—");
    expect(formatHours(0.5)).toBe("30m");
    expect(formatHours(5)).toBe("5h");
    expect(formatHours(52)).toBe("2d 4h");
    expect(formatHours(48)).toBe("2d");
  });
});
