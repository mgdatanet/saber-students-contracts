import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteClassButton } from "./DeleteClassButton";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*, programs(code, name), students(count)")
    .order("created_at", { ascending: false });

  const totalClasses = classes?.length ?? 0;
  const openClasses = classes?.filter((c) => !c.locked).length ?? 0;
  const lockedClasses = totalClasses - openClasses;
  const totalStudents = classes?.reduce((sum, c) => sum + (c.students?.[0]?.count ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Classes</h1>
          <p className="text-sm text-slate-500">Pick a class to see its students and enter their aid.</p>
        </div>
        <Link
          href="/classes/new"
          className="shrink-0 rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
        >
          New Class
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Classes" value={totalClasses} />
        <StatCard label="Open" value={openClasses} accent="text-emerald-600" />
        <StatCard label="Locked" value={lockedClasses} accent="text-brand-gold" />
        <StatCard label="Enrolled Students" value={totalStudents} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Program</th>
                <th className="px-5 py-3">Schedule</th>
                <th className="px-5 py-3">Students</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {classes?.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-brand-navy/5 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/classes/${c.id}`} className="font-medium text-brand-navy hover:underline">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{c.programs?.code}</td>
                  <td className="px-5 py-3">{c.schedule}</td>
                  <td className="px-5 py-3">{c.students?.[0]?.count ?? 0}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                        c.locked ? "bg-brand-gold/15 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.locked ? "Locked (contracts issued)" : "Open"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!c.locked && <DeleteClassButton classId={c.id} classCode={c.code} />}
                  </td>
                </tr>
              ))}
              {classes?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No classes yet. Create one to get started.
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

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ?? "text-brand-navy"}`}>{value}</div>
    </div>
  );
}
