"use client";

import { useMemo, useState, useTransition } from "react";
import {
  computeContract,
  formatCurrency,
  validateStudent,
  type SemesterAidInput,
} from "@/lib/calc";
import { saveStudentAid } from "@/lib/actions/students";

const FIELDS: { key: keyof SemesterAidInput; label: string }[] = [
  { key: "credits", label: "Credits" },
  { key: "fees", label: "Fees" },
  { key: "pell", label: "Pell" },
  { key: "sub", label: "Sub" },
  { key: "unsub", label: "Unsub" },
  { key: "plus", label: "PLUS" },
  { key: "efc", label: "EFC" },
];

export function StudentAidGrid({
  classId,
  studentId,
  ratePerCredit,
  expectedCredits,
  hasSixSemesterDates,
  initialSemesters,
  identity,
  locked,
}: {
  classId: string;
  studentId: string;
  ratePerCredit: number;
  expectedCredits: number;
  hasSixSemesterDates: boolean;
  initialSemesters: SemesterAidInput[];
  identity: { firstName: string; lastName: string; ssn: string | null; dateOfBirth: string | null };
  locked: boolean;
}) {
  const [semesters, setSemesters] = useState<SemesterAidInput[]>(initialSemesters);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const totals = useMemo(() => computeContract(semesters, ratePerCredit), [semesters, ratePerCredit]);
  const validation = useMemo(
    () => validateStudent(identity, semesters, expectedCredits, hasSixSemesterDates, ratePerCredit),
    [identity, semesters, expectedCredits, hasSixSemesterDates, ratePerCredit]
  );

  function updateField(n: number, key: keyof SemesterAidInput, value: string) {
    const num = value === "" ? 0 : Number(value);
    setSemesters((prev) => prev.map((s) => (s.n === n ? { ...s, [key]: Number.isFinite(num) ? num : 0 } : s)));
    setSaved(false);
  }

  function fillFromSemesterOne() {
    setSemesters((prev) => {
      const first = prev.find((s) => s.n === 1);
      if (!first) return prev;
      return prev.map((s) =>
        s.n === 1
          ? s
          : { ...s, credits: first.credits, fees: first.fees, pell: first.pell, sub: first.sub, unsub: first.unsub, plus: first.plus, efc: first.efc }
      );
    });
    setSaved(false);
  }

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      const result = await saveStudentAid(classId, studentId, semesters);
      if (result.error) setSaveError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-navy">Semester Aid</h2>
          <button
            type="button"
            onClick={fillFromSemesterOne}
            className="text-sm text-brand-navy border border-brand-navy/30 rounded-lg px-3 py-1.5 hover:bg-brand-navy/5 transition-colors"
          >
            Fill semesters 2–6 from Semester 1
          </button>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="text-sm min-w-full">
          <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-3 py-3 sticky left-0 bg-slate-50">Field</th>
              {semesters.map((s) => (
                <th key={s.n} className="px-3 py-3 text-center">
                  Semester {s.n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((f) => (
              <tr key={f.key} className="border-t border-slate-100">
                <td className="px-3 py-1.5 sticky left-0 bg-white font-medium text-slate-700">{f.label}</td>
                {semesters.map((s) => (
                  <td key={s.n} className="px-2 py-1.5">
                    <input
                      type="number"
                      step={f.key === "credits" ? "1" : "0.01"}
                      disabled={locked}
                      value={s[f.key] === 0 ? "" : s[f.key]}
                      placeholder="0"
                      onChange={(e) => updateField(s.n, f.key, e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </td>
                ))}
              </tr>
            ))}

            <tr className="border-t-2 border-slate-200 bg-brand-navy/5">
              <td className="px-3 py-1.5 sticky left-0 bg-brand-navy/5 font-medium text-brand-navy">Total cost</td>
              {totals.semesters.map((s) => (
                <td key={s.n} className="px-3 py-1.5 text-right text-slate-600">
                  {formatCurrency(s.costeSemestre)}
                </td>
              ))}
            </tr>
            <tr className="bg-brand-navy/5">
              <td className="px-3 py-1.5 sticky left-0 bg-brand-navy/5 font-medium text-brand-navy">Total aid</td>
              {totals.semesters.map((s) => (
                <td key={s.n} className="px-3 py-1.5 text-right text-slate-600">
                  {formatCurrency(s.ayudaSemestre)}
                </td>
              ))}
            </tr>
            <tr className="bg-brand-navy/5">
              <td className="px-3 py-1.5 sticky left-0 bg-brand-navy/5 font-medium text-brand-navy">Balance</td>
              {totals.semesters.map((s) => (
                <td key={s.n} className="px-3 py-1.5 text-right text-slate-600">
                  {formatCurrency(s.saldo)}
                </td>
              ))}
            </tr>
            <tr className="bg-brand-navy/5">
              <td className="px-3 py-1.5 sticky left-0 bg-brand-navy/5 font-medium text-brand-navy">Financed</td>
              {totals.semesters.map((s) => (
                <td key={s.n} className="px-3 py-1.5 text-right text-slate-600">
                  {formatCurrency(s.financiado)}
                </td>
              ))}
            </tr>
            <tr className="bg-brand-navy/5">
              <td className="px-3 py-1.5 sticky left-0 bg-brand-navy/5 font-medium text-brand-navy">Payments</td>
              {totals.semesters.map((s) => (
                <td key={s.n} className="px-3 py-1.5 text-right text-slate-600">
                  {s.numPagos === 0 ? "—" : `${s.numPagos} × ${formatCurrency(s.importePago)}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-slate-500">Credits total</div>
          <div className="font-medium text-brand-navy">
            {totals.creditsTotal} / {expectedCredits}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Tuition</div>
          <div className="font-medium text-brand-navy">{formatCurrency(totals.matricula)}</div>
        </div>
        <div>
          <div className="text-slate-500">Total cost</div>
          <div className="font-medium text-brand-navy">{formatCurrency(totals.costeTotal)}</div>
        </div>
        <div>
          <div className="text-slate-500">Total aid</div>
          <div className="font-medium text-brand-navy">{formatCurrency(totals.ayudaTotal)}</div>
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <ul className="list-disc list-inside">
            {validation.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          <ul className="list-disc list-inside">
            {validation.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{saveError}</div>
      )}

      {!locked && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {saved && !isPending && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      )}
    </div>
  );
}
