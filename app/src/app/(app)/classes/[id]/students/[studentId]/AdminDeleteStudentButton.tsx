"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminDeleteStudent } from "@/lib/actions/adminOverrides";

export function AdminDeleteStudentButton({
  classId,
  studentId,
  studentName,
}: {
  classId: string;
  studentId: string;
  studentName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    if (
      !window.confirm(
        `Admin override: permanently delete ${studentName}, including their issued contract and PDF if any? This cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await adminDeleteStudent(classId, studentId);
      if (!result.success) setError(result.error ?? "Could not delete student");
      else router.push(`/classes/${classId}`);
    });
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50 bg-red-50 border border-red-300 rounded-md px-3 py-1.5"
      >
        {isPending ? "Deleting…" : "Admin: Delete Student"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
