import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("historical_students")
    .select("*")
    .order("last_name")
    .limit(50);

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,ssn.ilike.%${q}%`);
  }

  const { data: students } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">History</h1>
        <p className="text-sm text-slate-500">
          Read-only records imported from the old Excel workbook. These are not editable here.
        </p>
      </div>

      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or SSN…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">SSN</th>
                <th className="px-5 py-3">Legacy class</th>
                <th className="px-5 py-3">Program</th>
                <th className="px-5 py-3">Contract date</th>
              </tr>
            </thead>
            <tbody>
              {students?.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-brand-navy/5 transition-colors">
                  <td className="px-5 py-3 font-medium text-brand-navy">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-5 py-3">{s.ssn}</td>
                  <td className="px-5 py-3">{s.legacy_class_code}</td>
                  <td className="px-5 py-3">{s.program_code}</td>
                  <td className="px-5 py-3">{s.contract_date}</td>
                </tr>
              ))}
              {(!students || students.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    {q ? "No matches." : "No historical records imported yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
