"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendContractForSignature } from "@/lib/actions/signing";

type Status = "issued" | "pending_signature" | "signed_by_student" | "countersigned" | "voided";

const STATUS_COPY: Record<Status, { label: string; className: string }> = {
  issued: { label: "Not sent yet", className: "bg-slate-100 text-slate-600 border-slate-200" },
  pending_signature: { label: "Waiting on student", className: "bg-amber-50 text-amber-800 border-amber-200" },
  signed_by_student: { label: "Signed — needs countersignature", className: "bg-blue-50 text-blue-800 border-blue-200" },
  countersigned: { label: "Fully executed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  voided: { label: "Voided", className: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SendForSignatureCard({
  contractId,
  status,
  studentEmail,
  sentAt,
  studentSignedAt,
  linkExpiresAt,
}: {
  contractId: string;
  status: Status;
  studentEmail: string | null;
  sentAt: string | null;
  studentSignedAt: string | null;
  linkExpiresAt: string | null;
}) {
  const [email, setEmail] = useState(studentEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const badge = STATUS_COPY[status];
  const canSend = status === "issued" || status === "pending_signature";

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendContractForSignature(contractId, email);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-brand-navy">Signature</h2>
          <p className="text-sm text-slate-500">
            {status === "issued" && "Email the student a link to sign this contract online."}
            {status === "pending_signature" &&
              `Sent ${formatDate(sentAt)}${linkExpiresAt ? ` · link expires ${formatDate(linkExpiresAt)}` : ""}`}
            {status === "signed_by_student" && `Student signed ${formatDate(studentSignedAt)}`}
            {status === "countersigned" && "Signed by both parties."}
            {status === "voided" && "This contract was voided."}
          </p>
        </div>
        <span className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${badge.className}`}>{badge.label}</span>
      </div>

      {canSend && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <label htmlFor="student-email" className="mb-1 block text-sm text-slate-600">
              Student email
            </label>
            <input
              id="student-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={send}
            disabled={isPending || !email.trim()}
            className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-blue disabled:opacity-50"
          >
            {isPending ? "Sending…" : status === "pending_signature" ? "Resend link" : "Send to sign"}
          </button>
        </div>
      )}

      {status === "pending_signature" && (
        <p className="mt-2 text-xs text-slate-500">
          Resending generates a brand-new link and invalidates the previous one.
        </p>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
