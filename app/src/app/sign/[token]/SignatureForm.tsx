"use client";

import { useRef, useState, useTransition } from "react";
import { submitStudentSignature } from "@/lib/actions/signing";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";

export function SignatureForm({
  token,
  studentName,
  alreadySigned,
}: {
  token: string;
  studentName: string;
  alreadySigned: boolean;
}) {
  const pad = useRef<SignaturePadHandle>(null);

  const [hasInk, setHasInk] = useState(false);
  const [consented, setConsented] = useState(false);
  const [signed, setSigned] = useState(alreadySigned);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const dataUrl = pad.current?.toDataURL();
    if (!dataUrl) return;
    setError(null);

    startTransition(async () => {
      const result = await submitStudentSignature(token, dataUrl);
      if (result.error) setError(result.error);
      else setSigned(true);
    });
  }

  if (signed) {
    return (
      <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Signed successfully
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-slate-600">
          Thanks, {studentName}. SABER College&apos;s Financial Aid office has been notified and will countersign
          your agreement shortly. You&apos;ll receive the fully executed copy by email once that&apos;s complete.
        </p>
      </div>
    );
  }

  const ready = hasInk && consented;

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h3 className="font-semibold text-brand-navy">Your signature</h3>
      <p className="mb-3.5 text-sm text-slate-500">
        Draw your signature in the box below using your mouse, stylus, or finger.
      </p>

      <SignaturePad ref={pad} onInkChange={setHasInk} />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {studentName} &middot;{" "}
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

      <label className="mt-4.5 flex items-start gap-2.5 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 size-4.5 shrink-0 accent-brand-blue"
        />
        <span>
          <strong className="text-slate-900">I agree</strong> this electronic signature is legally binding and
          equivalent to my handwritten signature on this enrollment agreement.
        </span>
      </label>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 size-3.5 shrink-0 text-brand-blue">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          For your protection, we record the date, time, and IP address of this signature as part of the signed
          contract&apos;s audit trail.
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={submit}
          disabled={!ready || isPending}
          className="rounded-lg bg-brand-blue px-6 py-3 text-[15px] font-bold text-white shadow-sm transition hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending ? "Submitting…" : "Sign & submit agreement"}
        </button>
        <span className="text-sm text-slate-500">
          {ready ? "Ready to sign" : !hasInk ? "Draw your signature and check the box to continue" : "Check the box to confirm and continue"}
        </span>
      </div>
    </div>
  );
}
