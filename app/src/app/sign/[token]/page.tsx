import Image from "next/image";
import { getContractByToken } from "@/lib/actions/signing";
import { SigningExperience } from "./SigningExperience";

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
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
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
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-white/85">
            <Detail label="Student" value={contract.studentName} />
            <Detail label="Program" value={contract.programName} />
            <Detail label="Contract No." value={contract.contractNumber} />
          </dl>
        </header>

        <Stepper signed={contract.alreadySigned} />

        {contract.html ? (
          <SigningExperience
            token={token}
            html={contract.html}
            studentName={contract.studentName}
            alreadySigned={contract.alreadySigned}
          />
        ) : (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            The agreement isn&apos;t available right now. Please contact the school before signing.
          </p>
        )}

        <footer className="pb-8 text-center text-xs leading-relaxed text-slate-500">
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value || "—"}</dd>
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
