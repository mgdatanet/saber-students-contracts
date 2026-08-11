"use client";

import { useMemo, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";

type Program = Tables<"programs">;
type Signer = Tables<"signers">;
type ClassRow = Tables<"classes">;
type SemesterRow = { n: number; start_date: string; end_date: string };

const SNAPSHOT_FIELDS: { name: keyof Program; classField: keyof ClassRow; label: string; step?: string }[] = [
  { name: "default_tuition_per_credit", classField: "tuition_per_credit", label: "Tuition per credit ($)", step: "0.01" },
  { name: "credits_total", classField: "credits_total", label: "Total credits" },
  { name: "weeks_total", classField: "weeks_total", label: "Total weeks" },
  { name: "months_total", classField: "months_total", label: "Total months" },
  { name: "min_grade_pct", classField: "min_grade_pct", label: "Minimum grade (%)" },
  { name: "testing_fee", classField: "testing_fee", label: "Testing fee" },
  { name: "application_fee_per_sem", classField: "application_fee_per_sem", label: "Application fee / semester" },
  { name: "registration_fee_per_sem", classField: "registration_fee_per_sem", label: "Registration fee / semester" },
  { name: "skills_lab_fee", classField: "skills_lab_fee", label: "Skills lab fee" },
  { name: "materials_supplies_fee", classField: "materials_supplies_fee", label: "Materials & supplies" },
  { name: "books_supplies_fee", classField: "books_supplies_fee", label: "Books & supplies" },
  { name: "bls_fee", classField: "bls_fee", label: "BLS training & certificate" },
  { name: "other_costs_fee", classField: "other_costs_fee", label: "Other costs" },
  { name: "theory_lab_hours_a", classField: "theory_lab_hours_a", label: "Theory/Lab hrs/day (row 1)" },
  { name: "clinical_hours_a", classField: "clinical_hours_a", label: "Clinical hrs/day (row 1)" },
  { name: "theory_lab_hours_b", classField: "theory_lab_hours_b", label: "Theory/Lab hrs/day (row 2)" },
  { name: "clinical_hours_b", classField: "clinical_hours_b", label: "Clinical hrs/day (row 2)" },
];

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ClassForm({
  action,
  programs,
  signers,
  error,
  defaultValues,
  defaultSemesters,
  locked = false,
  submitLabel = "Create Class",
}: {
  action: (formData: FormData) => void;
  programs: Program[];
  signers: Signer[];
  error?: string;
  defaultValues?: Partial<ClassRow>;
  defaultSemesters?: SemesterRow[];
  locked?: boolean;
  submitLabel?: string;
}) {
  const isEdit = !!defaultValues;
  const [programId, setProgramId] = useState(defaultValues?.program_id ?? programs[0]?.id ?? "");
  const program = useMemo(() => programs.find((p) => p.id === programId), [programs, programId]);

  const [weeksTotal, setWeeksTotal] = useState<number>(
    defaultValues?.weeks_total ?? program?.weeks_total ?? 96
  );
  const [semesters, setSemesters] = useState<SemesterRow[]>(
    defaultSemesters && defaultSemesters.length === 6
      ? defaultSemesters
      : [1, 2, 3, 4, 5, 6].map((n) => ({ n, start_date: "", end_date: "" }))
  );
  const [calcStartDate, setCalcStartDate] = useState("");

  function calculateSemesters() {
    if (!calcStartDate || weeksTotal <= 0) return;
    const semLengthDays = Math.round((weeksTotal / 6) * 7);
    const gapDays = 7;
    const next: SemesterRow[] = [];
    let cursor = calcStartDate;
    for (let n = 1; n <= 6; n++) {
      const start = cursor;
      const end = addDays(start, semLengthDays - 1);
      next.push({ n, start_date: start, end_date: end });
      cursor = addDays(end, gapDays);
    }
    setSemesters(next);
  }

  return (
    <form action={action} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">Program</label>
            <select
              name="program_id"
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                const p = programs.find((x) => x.id === e.target.value);
                if (p) setWeeksTotal(p.weeks_total);
              }}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm text-slate-600 mb-1">Class code</label>
          <input
            name="code"
            required
            defaultValue={defaultValues?.code ?? ""}
            placeholder="e.g. RS 07-13-2026"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Schedule</label>
          <select
            name="schedule"
            defaultValue={defaultValues?.schedule ?? "Day"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="Day">Day</option>
            <option value="Evening">Evening</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Method of delivery</label>
          <select
            name="method_of_delivery"
            defaultValue={defaultValues?.method_of_delivery ?? "Residential"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="Residential">Residential</option>
            <option value="Blended Hybrid">Blended Hybrid</option>
            <option value="Full Distance">Full Distance (Online)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Accepted by (signer)</label>
          <select
            name="signer_id"
            defaultValue={defaultValues?.signer_id ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            {signers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Cohort label</label>
          <input
            name="cohort_label"
            defaultValue={defaultValues?.cohort_label ?? ""}
            placeholder="e.g. N-31"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-navy mb-1">Rates, fees & academic terms</h3>
        {locked ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
            This class has issued contracts — these numbers are locked and cannot be changed.
          </p>
        ) : (
          <p className="text-xs text-slate-500 mb-2">
            {isEdit
              ? "Review and adjust for this cohort. Once the first contract is issued, these numbers lock forever."
              : "Pre-filled from the selected program. Review and adjust for this specific cohort if needed — once the first contract is issued for this class, these numbers are locked forever."}
          </p>
        )}
        <div className="grid grid-cols-4 gap-4" key={isEdit ? "edit" : programId}>
          {SNAPSHOT_FIELDS.map((f) => (
            <div key={f.classField}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input
                name={f.classField}
                type="number"
                step={f.step ?? "0.01"}
                disabled={locked}
                defaultValue={
                  isEdit
                    ? ((defaultValues?.[f.classField] as number | undefined) ?? 0)
                    : ((program?.[f.name] as number | undefined) ?? 0)
                }
                onChange={f.classField === "weeks_total" ? (e) => setWeeksTotal(Number(e.target.value) || 0) : undefined}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-navy mb-1">The 6 semesters</h3>
        <p className="text-xs text-slate-500 mb-2">
          All 6 must have dates before a contract can be issued. Type them manually, or give a first start date
          and calculate the rest automatically (using {weeksTotal} total weeks ÷ 6, with a 1-week break between
          semesters) — the calculated dates are still editable afterward.
        </p>
        <div className="flex items-end gap-3 mb-3 bg-brand-navy/5 border border-slate-200 rounded-lg p-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">First semester start date</label>
            <input
              type="date"
              value={calcStartDate}
              onChange={(e) => setCalcStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          <button
            type="button"
            onClick={calculateSemesters}
            disabled={!calcStartDate}
            className="rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium px-4 py-2.5 hover:bg-brand-navy/5 disabled:opacity-50 transition-colors"
          >
            Calculate 6 semesters
          </button>
        </div>
        <div className="space-y-2">
          {semesters.map((s) => (
            <div key={s.n} className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
              <span className="text-sm text-slate-600">Semester {s.n}</span>
              <input
                name={`sem_${s.n}_start`}
                type="date"
                required
                value={s.start_date}
                onChange={(e) =>
                  setSemesters((prev) => prev.map((x) => (x.n === s.n ? { ...x, start_date: e.target.value } : x)))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
              <input
                name={`sem_${s.n}_end`}
                type="date"
                required
                value={s.end_date}
                onChange={(e) =>
                  setSemesters((prev) => prev.map((x) => (x.n === s.n ? { ...x, end_date: e.target.value } : x)))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}
