import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";
import {
  bucketByAge,
  buildFunnel,
  expiredLinks,
  formatHours,
  formatPercent,
  timeToCountersign,
  timeToSign,
  type AgeBucket,
  type ContractStatus,
  type FunnelStage,
  type SigningRow,
} from "@/lib/signing/stats";

export const metadata = { title: "Signature Report — SABER College" };

// Read-only, so every role sees it: Financial Aid owns the countersigning
// queue and has as much reason to watch these numbers as an admin.
export default async function SignatureReportPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select(
      "id, contract_number, status, sent_at, student_signed_at, countersigned_at, sign_token_expires_at, students(first_name, last_name), classes(code), countersigner:profiles!contracts_countersigned_by_fkey(full_name)",
    )
    .order("issued_at", { ascending: false });

  const rows: SigningRow[] = (contracts ?? []).map((c) => ({
    id: c.id,
    contractNumber: c.contract_number,
    studentName: `${c.students?.first_name ?? ""} ${c.students?.last_name ?? ""}`.trim(),
    className: c.classes?.code ?? "",
    status: c.status as ContractStatus,
    sentAt: c.sent_at,
    studentSignedAt: c.student_signed_at,
    countersignedAt: c.countersigned_at,
    countersignedByName: c.countersigner?.full_name ?? null,
    linkExpiresAt: c.sign_token_expires_at,
  }));

  const now = await requestNow();
  const funnel = buildFunnel(rows);
  const signing = timeToSign(rows);
  const countersigning = timeToCountersign(rows);
  const expiry = expiredLinks(rows, now);

  const awaitingStudent = rows.filter((r) => r.status === "pending_signature");
  const awaitingSchool = rows.filter((r) => r.status === "signed_by_student");
  const notSent = rows.filter((r) => r.status === "issued");

  const signed = rows
    .filter((r) => r.studentSignedAt)
    .sort((a, b) => (a.studentSignedAt! < b.studentSignedAt! ? 1 : -1))
    .slice(0, 25);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Signature Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Where every issued contract stands, how long each step takes, and what is waiting on someone.
        </p>
      </div>

      {/* Headline numbers. Not charts: each is one figure, and a bar of one
          value is just a number wearing a costume. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Fully executed"
          value={String(funnel[3].count)}
          detail={`${formatPercent(funnel[3].shareOfStart)} of all issued contracts`}
        />
        <Stat
          label="Typical time to sign"
          value={formatHours(signing.median)}
          detail={
            signing.count
              ? `median of ${signing.count} · average ${formatHours(signing.average)}`
              : "no signatures yet"
          }
        />
        <Stat
          label="Typical countersignature"
          value={formatHours(countersigning.median)}
          detail={
            countersigning.count
              ? `median of ${countersigning.count} · average ${formatHours(countersigning.average)}`
              : "none countersigned yet"
          }
        />
        <Stat
          label="Links left to expire"
          value={expiry.sent ? formatPercent(expiry.rate) : "—"}
          detail={expiry.sent ? `${expiry.expired} of ${expiry.sent} sent` : "nothing sent yet"}
          tone={expiry.rate > 0.15 ? "warning" : "neutral"}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-navy">From issued to fully executed</h2>
        <p className="mt-0.5 mb-4 text-xs text-slate-500">
          Each stage counts the contracts that reached it. Voided contracts are excluded.
        </p>
        <Funnel stages={funnel} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Queue
          title="Waiting on students"
          total={awaitingStudent.length}
          buckets={bucketByAge(awaitingStudent, (r) => r.sentAt, now)}
          empty="No contract is waiting on a student signature."
        />
        <Queue
          title="Waiting on Financial Aid"
          total={awaitingSchool.length}
          buckets={bucketByAge(awaitingSchool, (r) => r.studentSignedAt, now)}
          empty="Nothing is waiting to be countersigned."
          action={{ href: "/pending-signatures", label: "Go to the queue" }}
        />
      </div>

      {notSent.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{notSent.length}</strong> issued {notSent.length === 1 ? "contract has" : "contracts have"} never
          been sent for signature.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-brand-navy">Who has signed</h2>
          <p className="mt-0.5 text-xs text-slate-500">Most recent signatures first.</p>
        </div>

        {signed.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Student</th>
                  <th className="px-5 py-2.5 font-semibold">Contract</th>
                  <th className="px-5 py-2.5 font-semibold">Class</th>
                  <th className="px-5 py-2.5 font-semibold">Student signed</th>
                  <th className="px-5 py-2.5 font-semibold">Countersigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {signed.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.studentName || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-brand-blue">{row.contractNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{row.className}</td>
                    <td className="px-5 py-3 text-slate-600">{formatMoment(row.studentSignedAt)}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.countersignedAt ? (
                        <>
                          {formatMoment(row.countersignedAt)}
                          {row.countersignedByName && (
                            <span className="block text-xs text-slate-500">by {row.countersignedByName}</span>
                          )}
                        </>
                      ) : (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No student has signed a contract yet.</p>
        )}
      </section>
    </div>
  );
}

/** One instant per request, so every age on the page is measured from the same
 *  moment (and the clock is read outside the render itself). */
async function requestNow(): Promise<number> {
  return Date.now();
}

function formatMoment(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Stat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${tone === "warning" ? "text-amber-700" : "text-brand-navy"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

/**
 * One measure across four ordered stages: horizontal bars, one hue, counts
 * read straight off the ends. No legend — a single series is named by the
 * heading above it.
 */
function Funnel({ stages }: { stages: FunnelStage[] }) {
  return (
    <ol className="space-y-3">
      {stages.map((stage) => (
        <li key={stage.key} title={`${stage.label}: ${stage.count}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{stage.label}</span>
            <span className="text-slate-500">
              <span className="font-semibold text-slate-900">{stage.count}</span>
              {stage.conversion !== null && (
                <span className="ml-2 text-xs">{formatPercent(stage.conversion)} of the step before</span>
              )}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-blue"
              style={{ width: `${Math.max(stage.shareOfStart * 100, stage.count ? 2 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

const TONE_STYLES: Record<AgeBucket["tone"], string> = {
  ok: "border-slate-200 bg-slate-50 text-slate-600",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  serious: "border-red-200 bg-red-50 text-red-700",
};

function Queue({
  title,
  total,
  buckets,
  empty,
  action,
}: {
  title: string;
  total: number;
  buckets: AgeBucket[];
  empty: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        <span className="text-2xl font-semibold text-brand-navy">{total}</span>
      </div>

      {total ? (
        <ul className="mt-3 space-y-1.5">
          {buckets
            .filter((bucket) => bucket.count > 0)
            .map((bucket) => (
              <li
                key={bucket.label}
                // The label carries the meaning; the colour only reinforces it.
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${TONE_STYLES[bucket.tone]}`}
              >
                <span>{bucket.label}</span>
                <span className="font-semibold">{bucket.count}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      )}

      {action && total > 0 && (
        <Link href={action.href} className="mt-3 inline-block text-sm font-medium text-brand-blue hover:text-brand-navy">
          {action.label} →
        </Link>
      )}
    </section>
  );
}
