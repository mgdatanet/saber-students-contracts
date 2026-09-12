"use client";

import { useMemo, useState, useTransition } from "react";
import { ContractCanvas, type SlotState } from "@/components/ContractCanvas";
import { SignaturePadModal } from "@/components/SignaturePadModal";
import { INITIAL_SLOT_IDS, STUDENT_SLOT_IDS } from "@/lib/signing/slots";
import { submitStudentSignature } from "@/lib/actions/signing";

const SLOT_KIND: Record<string, "initials" | "signature"> = Object.fromEntries([
  ...INITIAL_SLOT_IDS.map((id) => [id, "initials" as const]),
  ["student-signature", "signature" as const],
]);

/**
 * Walks the student through signing: adopt a mark once, then place it on each
 * box as they read down the agreement, and only then submit.
 */
export function SigningExperience({
  token,
  html,
  studentName,
  alreadySigned,
}: {
  token: string;
  html: string;
  studentName: string;
  alreadySigned: boolean;
}) {
  const [adopted, setAdopted] = useState<{ initials: string | null; signature: string | null }>({
    initials: null,
    signature: null,
  });
  const [stamps, setStamps] = useState<SlotState>({});
  const [asking, setAsking] = useState<{ kind: "initials" | "signature"; slotId: string } | null>(null);
  const [focusSlot, setFocusSlot] = useState<{ id: string; nonce: number } | null>(null);
  const [consented, setConsented] = useState(false);
  const [signed, setSigned] = useState(alreadySigned);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const placed = STUDENT_SLOT_IDS.filter((id) => stamps[id]).length;
  const nextEmpty = STUDENT_SLOT_IDS.find((id) => !stamps[id]) ?? null;
  const allPlaced = placed === STUDENT_SLOT_IDS.length;

  const activeSlots = useMemo(() => [...STUDENT_SLOT_IDS], []);

  function stamp(slotId: string, dataUrl: string) {
    setStamps((current) => ({ ...current, [slotId]: dataUrl }));
  }

  function handleSlotClick(slotId: string) {
    const kind = SLOT_KIND[slotId];
    if (!kind) return;

    const mark = kind === "initials" ? adopted.initials : adopted.signature;
    if (mark) stamp(slotId, mark);
    else setAsking({ kind, slotId });
  }

  function handleAdopt(dataUrl: string) {
    if (!asking) return;
    setAdopted((current) => ({ ...current, [asking.kind]: dataUrl }));
    stamp(asking.slotId, dataUrl);
    setAsking(null);
  }

  function goToNext() {
    if (nextEmpty) setFocusSlot({ id: nextEmpty, nonce: Date.now() });
  }

  function submit() {
    if (!adopted.signature || !adopted.initials) return;
    setError(null);
    startTransition(async () => {
      const result = await submitStudentSignature(token, adopted.signature!, adopted.initials!);
      if (result.error) setError(result.error);
      else setSigned(true);
    });
  }

  if (signed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Signed successfully
        </div>
        <p className="mx-auto mt-4 max-w-prose text-sm leading-relaxed text-slate-600">
          Thanks, {studentName}. SABER College&apos;s Financial Aid office has been notified and will countersign
          your agreement shortly. You&apos;ll receive the fully executed copy by email once that&apos;s complete.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Sticky guide: what's left, and a jump to the next box. */}
      <div className="sticky top-0 z-30 -mx-1 mb-4 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {STUDENT_SLOT_IDS.map((id) => (
                <span
                  key={id}
                  className={`size-2.5 rounded-full ${stamps[id] ? "bg-emerald-500" : "bg-slate-300"}`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-700">
              {allPlaced
                ? "All set — confirm below to finish"
                : `${placed} of ${STUDENT_SLOT_IDS.length} placed — click the highlighted boxes as you read`}
            </span>
          </div>
          {!allPlaced && (
            <button
              type="button"
              onClick={goToNext}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-blue"
            >
              Take me to the next box
            </button>
          )}
        </div>
      </div>

      <ContractCanvas
        html={html}
        activeSlots={activeSlots}
        stamps={stamps}
        onSlotClick={handleSlotClick}
        focusSlot={focusSlot}
      />

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 size-4.5 shrink-0 accent-brand-blue"
          />
          <span>
            <strong className="text-slate-900">I agree</strong> that the initials and signature I placed on this
            agreement are legally binding and equivalent to my handwritten signature.
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

        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={submit}
            disabled={!allPlaced || !consented || isPending}
            className="rounded-lg bg-brand-blue px-6 py-3 text-[15px] font-bold text-white shadow-sm transition hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isPending ? "Submitting…" : "Sign & submit agreement"}
          </button>
          <span className="text-sm text-slate-500">
            {!allPlaced
              ? `${STUDENT_SLOT_IDS.length - placed} box${STUDENT_SLOT_IDS.length - placed === 1 ? "" : "es"} left to fill`
              : consented
                ? "Ready to sign"
                : "Check the box to confirm and continue"}
          </span>
        </div>
      </div>

      {asking && (
        <SignaturePadModal
          kind={asking.kind}
          signerName={studentName}
          onAdopt={handleAdopt}
          onCancel={() => setAsking(null)}
        />
      )}
    </>
  );
}
