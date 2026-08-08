"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { mergeContractPdfs } from "@/lib/actions/bulkPrint";

export interface ReportRow {
  id: string;
  classId: string;
  firstName: string;
  lastName: string;
  ssn: string | null;
  classCode: string | null;
  programCode: string | null;
  creditsTotal: number;
  totalCostFormatted: string;
  totalAidFormatted: string;
  contractNumber: string | null;
}

export function ResultsTable({ rows }: { rows: ReportRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [skippedNames, setSkippedNames] = useState<string[]>([]);

  const selectableIds = useMemo(() => rows.filter((r) => r.contractNumber).map((r) => r.id), [rows]);
  const allSelectableChecked = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelectableChecked) return new Set();
      return new Set(selectableIds);
    });
  }

  function handlePrintSelected() {
    setError(null);
    setSkippedNames([]);
    // Preserve the table's order among the selected ids.
    const orderedIds = rows.map((r) => r.id).filter((id) => selected.has(id));
    startTransition(async () => {
      const result = await mergeContractPdfs(orderedIds);
      if (result.error && !result.pdfBase64) {
        setError(result.error);
        return;
      }
      setSkippedNames(result.skipped);
      if (result.pdfBase64) {
        const byteChars = atob(result.pdfBase64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        window.open(URL.createObjectURL(blob), "_blank");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <span className="text-sm text-slate-500">
          {selected.size > 0 ? `${selected.size} selected` : "Check students to print their contracts together"}
        </span>
        <button
          type="button"
          onClick={handlePrintSelected}
          disabled={selected.size === 0 || isPending}
          className="rounded-md bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPending ? "Preparing…" : `Print Selected Contracts (${selected.size})`}
        </button>
      </div>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 print:hidden">{error}</div>
      )}
      {skippedNames.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 print:hidden">
          Skipped (no issued contract yet): {skippedNames.join(", ")}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left print:bg-white">
            <tr>
              <th className="px-4 py-2 print:hidden">
                <input type="checkbox" checked={allSelectableChecked} onChange={toggleAll} aria-label="Select all with contracts" />
              </th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">SSN</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Program</th>
              <th className="px-4 py-2">Credits</th>
              <th className="px-4 py-2">Total Cost</th>
              <th className="px-4 py-2">Total Aid</th>
              <th className="px-4 py-2">Contract</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 print:hidden">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    disabled={!r.contractNumber}
                    onChange={() => toggle(r.id)}
                    aria-label={`Select ${r.firstName} ${r.lastName}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/classes/${r.classId}/students/${r.id}`}
                    className="font-medium text-slate-900 hover:underline print:no-underline print:text-black"
                  >
                    {r.firstName} {r.lastName}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.ssn}</td>
                <td className="px-4 py-2">{r.classCode}</td>
                <td className="px-4 py-2">{r.programCode}</td>
                <td className="px-4 py-2">{r.creditsTotal}</td>
                <td className="px-4 py-2">{r.totalCostFormatted}</td>
                <td className="px-4 py-2">{r.totalAidFormatted}</td>
                <td className="px-4 py-2">{r.contractNumber ?? <span className="text-slate-400">—</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No students match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
