"use client";

import { useState, useTransition } from "react";
import { adminResetPassword } from "@/lib/actions/users";

export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    const next = window.prompt(`New temporary password for ${email} (at least 6 characters):`);
    if (!next) return;
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await adminResetPassword(userId, next);
      if (result.error) setError(result.error);
      else setDone(true);
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
        {isPending ? "Resetting…" : "Reset Password"}
      </button>
      {done && <span className="text-xs text-emerald-600 ml-1">Password updated.</span>}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
