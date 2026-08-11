"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { issueAllReadyContracts } from "@/lib/actions/contracts";

export function GenerateAllButton({ classId, readyCount }: { classId: string; readyCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

  function handleClick() {
    setErrors([]);
    startTransition(async () => {
      const result = await issueAllReadyContracts(classId);
      if (result.errors.length > 0) setErrors(result.errors);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Generating…" : `Generate ${readyCount} contract${readyCount === 1 ? "" : "s"}`}
      </button>
      {errors.length > 0 && (
        <div className="text-xs text-red-600 mt-1 max-w-md">
          {errors.length} failed: {errors.join("; ")}
        </div>
      )}
    </div>
  );
}
