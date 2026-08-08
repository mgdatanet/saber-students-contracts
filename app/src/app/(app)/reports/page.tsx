import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeContract, formatCurrency } from "@/lib/calc";
import { PrintButton } from "./PrintButton";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string; programId?: string }>;
}) {
  const { q, classId, programId } = await searchParams;
  const supabase = await createClient();

  const [{ data: programs }, { data: classes }] = await Promise.all([
    supabase.from("programs").select("id, code, name").order("code"),
    supabase.from("classes").select("id, code, program_id").order("code"),
  ]);

  let resolvedClassIds: string[] | null = null;
  if (!classId && programId) {
    resolvedClassIds = (classes ?? []).filter((c) => c.program_id === programId).map((c) => c.id);
  }

  let query = supabase
    .from("students")
    .select("*, classes(code, tuition_per_credit, programs(code, name)), student_semester_aid(*), contracts(contract_number)")
    .order("last_name");

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,ssn.ilike.%${q}%`);
  }
  if (classId) {
    query = query.eq("class_id", classId);
  } else if (resolvedClassIds) {
    query = query.in("class_id", resolvedClassIds.length > 0 ? resolvedClassIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: students } = await query;

  const rows = (students ?? []).map((s) => {
    const aid = (s.student_semester_aid ?? []).map((a) => ({
      n: a.semester_n,
      credits: a.credits,
      fees: a.fees,
      pell: a.pell,
      sub: a.sub,
      unsub: a.unsub,
      plus: a.plus,
      efc: a.efc,
    }));
    const totals = computeContract(aid, s.classes?.tuition_per_credit ?? 0);
    return { student: s, totals, contractNumber: s.contracts?.[0]?.contract_number ?? null };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            Search students by name, SSN, class, or program. Click a row to open and edit that student.
          </p>
        </div>
        <PrintButton />
      </div>

      <form className="flex flex-wrap gap-3 items-end print:hidden">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Search (name or SSN)</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. Ana or 307-83-0409"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm w-64"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Program</label>
          <select name="programId" defaultValue={programId ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All programs</option>
            {programs?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Class</label>
          <select name="classId" defaultValue={classId ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
        >
          Search
        </button>
        {(q || classId || programId) && (
          <Link href="/reports" className="text-sm text-slate-500 hover:text-slate-700">
            Clear
          </Link>
        )}
      </form>

      <div className="hidden print:block text-lg font-semibold">SABER College — Student Report</div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left print:bg-white">
            <tr>
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
            {rows.map(({ student: s, totals, contractNumber }) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/classes/${s.class_id}/students/${s.id}`}
                    className="font-medium text-slate-900 hover:underline print:no-underline print:text-black"
                  >
                    {s.first_name} {s.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2">{s.ssn}</td>
                <td className="px-4 py-2">{s.classes?.code}</td>
                <td className="px-4 py-2">{s.classes?.programs?.code}</td>
                <td className="px-4 py-2">{totals.creditsTotal}</td>
                <td className="px-4 py-2">{formatCurrency(totals.costeTotal)}</td>
                <td className="px-4 py-2">{formatCurrency(totals.ayudaTotal)}</td>
                <td className="px-4 py-2">
                  {contractNumber ?? <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No students match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 print:hidden">
        Looking for older cohorts? Check{" "}
        <Link href="/history" className="underline">
          History
        </Link>{" "}
        for read-only historical records.
      </p>
    </div>
  );
}
