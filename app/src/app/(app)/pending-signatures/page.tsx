import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";
import { CountersignCard } from "./CountersignCard";
import { ExecutedDownloadLink } from "@/components/ExecutedDownloadLink";

/** How long the in-page preview of a contract PDF stays valid. */
const PREVIEW_TTL_SECONDS = 60 * 30;

// Financial Aid's home. Admins share it, because they countersign too.
export default async function PendingSignaturesPage() {
  const { profile } = await requireProfile();
  if (profile.role === "staff") redirect("/classes");

  const supabase = await createClient();

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, contract_number, pdf_path, student_signed_at, students(first_name, last_name, email), classes(code, programs(name))",
      )
      .eq("status", "signed_by_student")
      .order("student_signed_at", { ascending: true }),
    supabase
      .from("contracts")
      .select(
        "id, contract_number, countersigned_at, executed_pdf_path, students(first_name, last_name), classes(code)",
      )
      .eq("status", "countersigned")
      .order("countersigned_at", { ascending: false })
      .limit(8),
  ]);

  // Signed preview URLs are minted here so the card can show the real document
  // the moment it opens, without a round trip per click.
  const previews = await Promise.all(
    (pending ?? []).map(async (contract) => {
      if (!contract.pdf_path) return null;
      const { data } = await supabase.storage
        .from("contracts")
        .createSignedUrl(contract.pdf_path, PREVIEW_TTL_SECONDS);
      return data?.signedUrl ?? null;
    }),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Pending Signatures</h1>
        <p className="mt-1 text-sm text-slate-500">
          {pending?.length
            ? `${pending.length} contract${pending.length === 1 ? "" : "s"} signed by the student and waiting on your countersignature.`
            : "Contracts signed by the student and waiting on your countersignature show up here."}
        </p>
      </div>

      {pending?.length ? (
        <div className="space-y-4">
          {pending.map((contract, i) => (
            <CountersignCard
              key={contract.id}
              contractId={contract.id}
              contractNumber={contract.contract_number}
              studentName={`${contract.students?.first_name ?? ""} ${contract.students?.last_name ?? ""}`.trim()}
              studentEmail={contract.students?.email ?? null}
              programName={contract.classes?.programs?.name ?? ""}
              className={contract.classes?.code ?? ""}
              studentSignedAt={contract.student_signed_at}
              pdfUrl={previews[i]}
              signerName={profile.full_name}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-700">Nothing waiting on you</p>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;ll get an email the moment a student signs their agreement.
          </p>
        </div>
      )}

      {recent?.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-navy">Recently countersigned</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((contract) => (
              <li key={contract.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    {contract.students?.first_name} {contract.students?.last_name}
                  </span>
                  <span className="ml-2 font-mono text-xs text-brand-blue">{contract.contract_number}</span>
                  <span className="ml-2 text-xs text-slate-500">{contract.classes?.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {contract.countersigned_at
                      ? new Date(contract.countersigned_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                  {contract.executed_pdf_path && <ExecutedDownloadLink contractId={contract.id} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
