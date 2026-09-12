"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ContractCanvas } from "@/components/ContractCanvas";
import { SignaturePadModal } from "@/components/SignaturePadModal";
import { SCHOOL_SLOT_IDS } from "@/lib/signing/slots";
import { countersignContract, getContractForCountersign } from "@/lib/actions/signing";

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
  signerName,
}: {
  contractId: string;
  contractNumber: string;
  studentName: string;
  studentEmail: string | null;
  programName: string;
  className: string;
  studentSignedAt: string | null;
  signerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const waiting = waitingFor(studentSignedAt);
  const ready = Boolean(signature) && consented;

  function toggle() {
    const next = !open;
    setOpen(next);
    // The document is the whole contract, so it is fetched only when someone
    // actually opens the card rather than with every row of the queue.
    if (next && !html) {
      startLoading(async () => {
        const result = await getContractForCountersign(contractId);
        if (result.error) setError(result.error);
        else setHtml(result.html ?? null);
      });
    }
  }

  function countersign() {
    if (!signature) return;
    setError(null);

    startTransition(async () => {
      const result = await countersignContract(contractId, signature);
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
          onClick={toggle}
          className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-blue"
        >
          {open ? "Close" : "Review & countersign"}
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-slate-200 p-5">
          {isLoading && <p className="text-sm text-slate-500">Loading the signed agreement…</p>}

          {html && (
            <>
              <p className="text-sm text-slate-500">
                This is the agreement exactly as the student signed it. Click the highlighted box on the
                &ldquo;Accepted by&rdquo; line to add your signature.
              </p>
              <ContractCanvas
                html={html}
                activeSlots={[...SCHOOL_SLOT_IDS]}
                stamps={{ "school-signature": signature }}
                onSlotClick={() => setAsking(true)}
              />
            </>
          )}

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
                : !signature
                  ? "Click the highlighted box in the agreement to sign"
                  : "Check the box to confirm and continue"}
            </span>
          </div>
        </div>
      )}

      {asking && (
        <SignaturePadModal
          kind="signature"
          signerName={signerName}
          onAdopt={(dataUrl) => {
            setSignature(dataUrl);
            setAsking(false);
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </div>
  );
}
