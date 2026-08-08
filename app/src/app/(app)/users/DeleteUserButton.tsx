"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUser } from "@/lib/actions/users";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    if (!window.confirm(`Remove access for ${email}? They will no longer be able to sign in.`)) return;
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <span>
      <button type="button" onClick={handleClick} disabled={isPending} className="text-red-600 hover:text-red-800 disabled:opacity-50">
        {isPending ? "Removing…" : "Remove"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
