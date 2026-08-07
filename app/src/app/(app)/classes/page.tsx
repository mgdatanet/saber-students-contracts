import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteClassButton } from "./DeleteClassButton";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*, programs(code, name), students(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Classes</h1>
          <p className="text-sm text-slate-500">Pick a class to see its students and enter their aid.</p>
        </div>
        <Link
          href="/classes/new"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
        >
          New Class
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Program</th>
              <th className="px-4 py-2">Schedule</th>
              <th className="px-4 py-2">Students</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {classes?.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/classes/${c.id}`} className="font-medium text-slate-900 hover:underline">
                    {c.code}
                  </Link>
                </td>
                <td className="px-4 py-2">{c.programs?.code}</td>
                <td className="px-4 py-2">{c.schedule}</td>
                <td className="px-4 py-2">{c.students?.[0]?.count ?? 0}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      c.locked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.locked ? "Locked (contracts issued)" : "Open"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {!c.locked && <DeleteClassButton classId={c.id} classCode={c.code} />}
                </td>
              </tr>
            ))}
            {classes?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No classes yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
