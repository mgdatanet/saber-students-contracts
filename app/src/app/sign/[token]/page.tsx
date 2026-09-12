import Image from "next/image";
import { getContractByToken } from "@/lib/actions/signing";
import { SignatureForm } from "./SignatureForm";

export const metadata = {
  title: "Sign your enrollment agreement — SABER College",
};

// Public: students have no account. The token in the URL is the credential,
// and /sign is excluded from the session middleware for exactly that reason.
export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contract = await getContractByToken(token);

  // Expired and unknown tokens land here alike — a student who waited too long
  // needs a way forward, not a 404.
  if (!contract) return <LinkUnavailable />;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-brand-navy to-brand-blue p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-19 shrink-0 items-center justify-center rounded-xl bg-white p-2">
              <Image src="/logo.png" alt="SABER College" width={120} height={120} className="h-full w-auto" priority />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/75">
                SABER College &middot; Enrollment
              </div>
              <h1 className="text-xl font-semibold text-white">Sign your enrollment agreement</h1>
            </div>
          </div>
        </header>

        <Stepper signed={contract.alreadySigned} />

        <div className="grid items-start gap-5 md:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contract summary</h2>
            <dl className="divide-y divide-slate-200">
              <Detail label="Student" value={contract.studentName} />
              <Detail label="Program" value={contract.programName} />
              <Detail label="Class" value={contract.className} />
              <Detail label="Contract No." value={contract.contractNumber} mono />
            </dl>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-navy">Enrollment Agreement</h2>
            <p className="mb-4 text-sm text-slate-500">
              Read the agreement below, then sign at the bottom of this page.
            </p>

            {contract.pdfUrl ? (
              <iframe
                src={contract.pdfUrl}
                title={`Contract ${contract.contractNumber}`}
                className="h-[420px] w-full rounded-lg border border-slate-200 bg-slate-100"
              />
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                The contract document isn&apos;t available right now. Please contact the school before signing.
              </p>
            )}

            <SignatureForm
              token={token}
              studentName={contract.studentName}
              alreadySigned={contract.alreadySigned}
            />
          </section>
        </div>

        <footer className="text-center text-xs leading-relaxed text-slate-500">
          Trouble with this document? Contact{" "}
          <a href="mailto:enrollments@sabercollege.edu" className="underline">
            enrollments@sabercollege.edu
          </a>
          .
          <br />
          This link is unique to {contract.studentName} — please don&apos;t forward it.
        </footer>
      </div>
    </main>
  );
}

function LinkUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
          <Image src="/logo.png" alt="SABER College" width={120} height={120} className="h-full w-auto" priority />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-brand-navy">This signing link is no longer valid</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Signing links expire after a few days for your security, and each one can only be used once. Contact the
          school and we&apos;ll send you a fresh link.
        </p>
        <a
          href="mailto:enrollments@sabercollege.edu"
          className="mt-5 inline-block rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue"
        >
          Email enrollments@sabercollege.edu
        </a>
      </div>
    </main>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 first:pt-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-sm font-semibold text-slate-900 ${mono ? "font-mono text-brand-blue" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

function Stepper({ signed }: { signed: boolean }) {
  const steps = [
    { label: "Sent", done: true },
    { label: "Your signature", done: signed, current: !signed },
    { label: "Countersigned by school", done: false, current: signed },
  ];

  return (
    <ol className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
      {steps.map((step, i) => (
        <li key={step.label} className="flex min-w-max flex-1 items-center gap-2.5">
          <span
            className={`flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
              step.done
                ? "border-emerald-600 bg-emerald-600 text-white"
                : step.current
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-200 bg-slate-100 text-slate-500"
            }`}
          >
            {step.done ? "✓" : i + 1}
          </span>
          <span
            className={`text-sm font-semibold ${step.done || step.current ? "text-slate-900" : "text-slate-500"}`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span className={`h-0.5 min-w-4 flex-1 ${step.done ? "bg-brand-blue" : "bg-slate-200"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}
