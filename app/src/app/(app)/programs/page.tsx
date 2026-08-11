import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";
import { toggleProgramActive } from "@/lib/actions/programs";
import { formatCurrency } from "@/lib/calc";

export default async function ProgramsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const { data: programs } = await supabase.from("programs").select("*").order("code");

  const totalPrograms = programs?.length ?? 0;
  const activePrograms = programs?.filter((p) => p.active).length ?? 0;
  const retiredPrograms = totalPrograms - activePrograms;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Programs</h1>
          <p className="text-sm text-slate-500">
            Every program the school offers, with its own tuition, credits, fees and academic terms. Retire a
            program instead of deleting it — past classes still reference it.
          </p>
        </div>
        {profile.role === "admin" && (
          <Link
            href="/programs/new"
            className="shrink-0 rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
          >
            New Program
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Programs" value={totalPrograms} />
        <StatCard label="Active" value={activePrograms} accent="text-emerald-600" />
        <StatCard label="Retired" value={retiredPrograms} accent="text-slate-500" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Credential</th>
                <th className="px-5 py-3">Rate / credit</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {programs?.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-brand-navy/5 transition-colors">
                  <td className="px-5 py-3 font-medium text-brand-navy">{p.code}</td>
                  <td className="px-5 py-3">{p.name}</td>
                  <td className="px-5 py-3">{p.credential_name}</td>
                  <td className="px-5 py-3">{formatCurrency(p.default_tuition_per_credit)}</td>
                  <td className="px-5 py-3">{p.credits_total}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                        p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.active ? "Active" : "Retired"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                    {profile.role === "admin" && (
                      <>
                        <Link href={`/programs/${p.id}`} className="text-brand-navy hover:underline">
                          Edit
                        </Link>
                        <form
                          action={toggleProgramActive.bind(null, p.id, !p.active)}
                          className="inline"
                        >
                          <button type="submit" className="text-brand-navy hover:underline">
                            {p.active ? "Retire" : "Reactivate"}
                          </button>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              ))}
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
