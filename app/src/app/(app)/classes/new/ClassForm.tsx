"use client";

import { useMemo, useState } from "react";
import { createClass } from "@/lib/actions/classes";
import type { Tables } from "@/lib/supabase/database.types";

type Program = Tables<"programs">;
type Signer = Tables<"signers">;

const SNAPSHOT_FIELDS: { name: keyof Program; label: string; step?: string }[] = [
  { name: "default_tuition_per_credit", label: "Tuition per credit ($)", step: "0.01" },
  { name: "credits_total", label: "Total credits" },
  { name: "weeks_total", label: "Total weeks" },
  { name: "months_total", label: "Total months" },
  { name: "min_grade_pct", label: "Minimum grade (%)" },
  { name: "testing_fee", label: "Testing fee" },
  { name: "application_fee_per_sem", label: "Application fee / semester" },
  { name: "registration_fee_per_sem", label: "Registration fee / semester" },
  { name: "skills_lab_fee", label: "Skills lab fee" },
  { name: "materials_supplies_fee", label: "Materials & supplies" },
  { name: "books_supplies_fee", label: "Books & supplies" },
  { name: "bls_fee", label: "BLS training & certificate" },
  { name: "other_costs_fee", label: "Other costs" },
  { name: "theory_lab_hours_a", label: "Theory/Lab hrs/day (row 1)" },
  { name: "clinical_hours_a", label: "Clinical hrs/day (row 1)" },
  { name: "theory_lab_hours_b", label: "Theory/Lab hrs/day (row 2)" },
  { name: "clinical_hours_b", label: "Clinical hrs/day (row 2)" },
];

// Fields on `classes` don't share the exact same name as their `programs` source
// for the tuition rate — map that one explicitly.
const TARGET_NAME: Record<string, string> = {
  default_tuition_per_credit: "tuition_per_credit",
};

export function ClassForm({
  programs,
  signers,
  error,
}: {
  programs: Program[];
  signers: Signer[];
  error?: string;
}) {
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const program = useMemo(() => programs.find((p) => p.id === programId), [programs, programId]);

  return (
    <form action={createClass} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Program</label>
          <select
            name="program_id"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Class code</label>
          <input
            name="code"
            required
            placeholder="e.g. RS 07-13-2026"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Schedule</label>
          <select name="schedule" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="Day">Day</option>
            <option value="Evening">Evening</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Method of delivery</label>
          <select
            name="method_of_delivery"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="Residential">Residential</option>
            <option value="Blended Hybrid">Blended Hybrid</option>
            <option value="Full Distance">Full Distance (Online)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Accepted by (signer)</label>
          <select name="signer_id" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
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
            placeholder="e.g. N-31"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-slate-900 mb-1">Rates, fees & academic terms</h3>
        <p className="text-xs text-slate-500 mb-2">
          Pre-filled from the selected program. Review and adjust for this specific cohort if needed — once
          the first contract is issued for this class, these numbers are locked forever.
        </p>
        <div className="grid grid-cols-4 gap-4" key={programId}>
          {SNAPSHOT_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input
                name={TARGET_NAME[f.name] ?? f.name}
                type="number"
                step={f.step ?? "0.01"}
                defaultValue={(program?.[f.name] as number | undefined) ?? 0}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-slate-900 mb-1">The 6 semesters</h3>
        <p className="text-xs text-slate-500 mb-2">All 6 must have dates before a contract can be issued.</p>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
              <span className="text-sm text-slate-600">Semester {n}</span>
              <input
                name={`sem_${n}_start`}
                type="date"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name={`sem_${n}_end`}
                type="date"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
      >
        Create Class
      </button>
    </form>
  );
}
