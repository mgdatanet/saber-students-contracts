"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminDeleteContract } from "@/lib/actions/adminOverrides";

export function AdminDeleteContractButton({ contractId }: { contractId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    if (
      !window.confirm(
        "Delete this issued contract? This removes the frozen PDF and audit record, and re-opens the class so the numbers can be corrected. This cannot be undone. The student and their data are kept."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await adminDeleteContract(contractId);
      if (!result.success) setError(result.error ?? "Could not delete contract");
      else router.refresh();
    });
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 border border-red-200 rounded-lg px-3 py-1.5"
      >
        {isPending ? "Deleting…" : "Delete Contract"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
