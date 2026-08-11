"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveUser } from "@/lib/actions/users";

export function ApproveUserButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await approveUser(userId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Approving…" : "Approve"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
