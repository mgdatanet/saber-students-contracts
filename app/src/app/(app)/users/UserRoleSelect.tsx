"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateUserRole } from "@/lib/actions/users";

export function UserRoleSelect({ userId, role }: { userId: string; role: "admin" | "staff" }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleChange(newRole: "admin" | "staff") {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <select
        value={role}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as "admin" | "staff")}
        className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      >
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}
