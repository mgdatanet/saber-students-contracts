"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteClass } from "@/lib/actions/classes";

export function DeleteClassButton({
  classId,
  classCode,
  afterDeleteHref,
}: {
  classId: string;
  classCode: string;
  afterDeleteHref?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    if (!window.confirm(`Delete class ${classCode}? This removes all its students and cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteClass(classId);
      if (!result.success) setError(result.error ?? "Could not delete class");
      else if (afterDeleteHref) router.push(afterDeleteHref);
      else router.refresh();
    });
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </span>
  );
}
