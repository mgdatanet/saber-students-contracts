"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteStudent } from "@/lib/actions/classes";

export function DeleteStudentButton({
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
    if (!window.confirm(`Delete ${studentName}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteStudent(classId, studentId);
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
        className="text-red-600 hover:text-red-800 disabled:opacity-50 text-sm"
      >
        {isPending ? "Deleting…" : "Delete Student"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
