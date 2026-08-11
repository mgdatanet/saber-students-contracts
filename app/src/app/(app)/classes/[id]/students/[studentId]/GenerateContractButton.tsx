"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { issueContract } from "@/lib/actions/contracts";

export function GenerateContractButton({ classId, studentId }: { classId: string; studentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await issueContract(classId, studentId);
      if (!result.success) {
        setError(result.error ?? "Could not generate contract");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Generating…" : "Generate Contract"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1 max-w-xs">{error}</div>}
    </div>
  );
}
