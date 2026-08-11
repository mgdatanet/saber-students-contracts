import type { Tables } from "@/lib/supabase/database.types";

type ProgramRow = Tables<"programs">;

const NUMBER_FIELDS: { name: keyof ProgramRow; label: string; step?: string }[] = [
  { name: "default_tuition_per_credit", label: "Tuition per credit ($)", step: "0.01" },
  { name: "credits_total", label: "Total credits" },
  { name: "weeks_total", label: "Total weeks" },
  { name: "months_total", label: "Total months" },
  { name: "min_grade_pct", label: "Minimum grade (%)" },
];

const FEE_FIELDS: { name: keyof ProgramRow; label: string }[] = [
  { name: "testing_fee", label: "Testing fee" },
  { name: "application_fee_per_sem", label: "Application fee / semester" },
  { name: "registration_fee_per_sem", label: "Registration fee / semester" },
  { name: "skills_lab_fee", label: "Skills lab fee" },
  { name: "materials_supplies_fee", label: "Materials & supplies" },
  { name: "books_supplies_fee", label: "Books & supplies" },
  { name: "bls_fee", label: "BLS training & certificate" },
  { name: "other_costs_fee", label: "Other costs" },
];

const HOURS_FIELDS: { name: keyof ProgramRow; label: string }[] = [
  { name: "theory_lab_hours_a", label: "Theory/Lab hrs/day (row 1)" },
  { name: "clinical_hours_a", label: "Clinical hrs/day (row 1)" },
  { name: "theory_lab_hours_b", label: "Theory/Lab hrs/day (row 2)" },
  { name: "clinical_hours_b", label: "Clinical hrs/day (row 2)" },
];

export function ProgramForm({
  action,
  defaultValues,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<ProgramRow>;
  error?: string;
  submitLabel: string;
}) {
  const dv = defaultValues ?? {};

  return (
    <form action={action} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Code</label>
          <input
            name="code"
            defaultValue={dv.code ?? ""}
            required
            placeholder="e.g. RS"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Degree type</label>
          <select
            name="degree_type"
            defaultValue={dv.degree_type ?? "associate"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="associate">Associate</option>
            <option value="diploma">Diploma</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Program name</label>
          <input
            name="name"
            defaultValue={dv.name ?? ""}
            required
            placeholder="e.g. Professional Nursing"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Credential awarded upon completion</label>
          <input
            name="credential_name"
            defaultValue={dv.credential_name ?? ""}
            required
            placeholder="e.g. Associate in Science"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-navy mb-2">Program length & academic terms</h3>
        <div className="grid grid-cols-3 gap-4">
          {NUMBER_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input
                name={f.name}
                type="number"
                step={f.step ?? "1"}
                defaultValue={(dv[f.name] as number | undefined) ?? 0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-navy mb-2">Fixed fees printed on the contract</h3>
        <div className="grid grid-cols-3 gap-4">
          {FEE_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input
                name={f.name}
                type="number"
                step="0.01"
                defaultValue={(dv[f.name] as number | undefined) ?? 0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-navy mb-2">
          Hours and days available (page 4 of the contract)
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {HOURS_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input
                name={f.name}
                type="number"
                step="0.01"
                defaultValue={(dv[f.name] as number | undefined) ?? 0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
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
