"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { countersignContract } from "@/lib/actions/signing";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Rough "how long has this been sitting here", so the oldest items read as urgent. */
function waitingFor(iso: string | null): { label: string; stale: boolean } {
  if (!iso) return { label: "", stale: false };
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return { label: "just now", stale: false };
  if (hours < 24) return { label: `${Math.floor(hours)}h waiting`, stale: false };
  const days = Math.floor(hours / 24);
  return { label: `${days}d waiting`, stale: days >= 3 };
}

export function CountersignCard({
  contractId,
  contractNumber,
  studentName,
  studentEmail,
  programName,
  className,
  studentSignedAt,
  pdfUrl,
  signerName,
}: {
  contractId: string;
  contractNumber: string;
  studentName: string;
  studentEmail: string | null;
  programName: string;
  className: string;
  studentSignedAt: string | null;
  pdfUrl: string | null;
  signerName: string;
}) {
  const pad = useRef<SignaturePadHandle>(null);
  const [open, setOpen] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const waiting = waitingFor(studentSignedAt);
  const ready = hasInk && consented;

  function countersign() {
    const dataUrl = pad.current?.toDataURL();
    if (!dataUrl) return;
    setError(null);

    startTransition(async () => {
      const result = await countersignContract(contractId, dataUrl);
      // An error here can still mean "signed, but the email didn't go out" —
      // the action says which, so show it and refresh either way.
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{studentName || "—"}</h2>
            <span className="font-mono text-xs text-brand-blue">{contractNumber}</span>
            {waiting.label && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  waiting.stale
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {waiting.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {programName}
            {className ? ` · ${className}` : ""} · signed {formatDate(studentSignedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-blue"
        >
          {open ? "Close" : "Review & countersign"}
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-slate-200 p-5">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={`Contract ${contractNumber}`}
              className="h-[420px] w-full rounded-lg border border-slate-200 bg-slate-100"
            />
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This contract&apos;s PDF isn&apos;t available right now — don&apos;t countersign until you can read it.
            </p>
          )}

          <div>
            <h3 className="font-semibold text-brand-navy">Your signature</h3>
            <p className="mb-3.5 text-sm text-slate-500">
              Draw your signature below. It&apos;s added to the contract on a signature certificate page alongside
              the student&apos;s.
            </p>

            <SignaturePad ref={pad} onInkChange={setHasInk} className="h-40" />

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {signerName} &middot;{" "}
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => pad.current?.clear()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 size-4.5 shrink-0 accent-brand-blue"
            />
            <span>
              <strong className="text-slate-900">I confirm</strong> I have reviewed this agreement and am signing it
              on behalf of SABER College. This electronic signature is legally binding.
            </span>
          </label>

          {!studentEmail && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This student has no email on file, so the signed copy can&apos;t be emailed to them. Countersigning
              still works — you&apos;ll need to deliver the copy another way.
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={countersign}
              disabled={!ready || isPending}
              className="rounded-lg bg-brand-blue px-6 py-3 text-[15px] font-bold text-white shadow-sm transition hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPending ? "Countersigning…" : "Countersign & send copy"}
            </button>
            <span className="text-sm text-slate-500">
              {ready
                ? studentEmail
                  ? `The signed copy goes to ${studentEmail}`
                  : "Ready to countersign"
                : !hasInk
                  ? "Draw your signature and check the box to continue"
                  : "Check the box to confirm and continue"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
