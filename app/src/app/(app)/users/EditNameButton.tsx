"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateUserName } from "@/lib/actions/users";

export function EditNameButton({ userId, fullName }: { userId: string; fullName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    const next = window.prompt("Full name:", fullName);
    if (next === null || next.trim() === fullName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await updateUserName(userId, next);
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
        className="text-brand-navy hover:underline text-sm disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Edit"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
