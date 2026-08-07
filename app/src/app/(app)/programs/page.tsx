import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/actions/profile";
import { toggleProgramActive } from "@/lib/actions/programs";
import { formatCurrency } from "@/lib/calc";

export default async function ProgramsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const { data: programs } = await supabase.from("programs").select("*").order("code");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Programs</h1>
          <p className="text-sm text-slate-500">
            Every program the school offers, with its own tuition, credits, fees and academic terms. Retire a
            program instead of deleting it — past classes still reference it.
          </p>
        </div>
        {profile.role === "admin" && (
          <Link
            href="/programs/new"
            className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
          >
            New Program
          </Link>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Credential</th>
              <th className="px-4 py-2">Rate / credit</th>
              <th className="px-4 py-2">Credits</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {programs?.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{p.code}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.credential_name}</td>
                <td className="px-4 py-2">{formatCurrency(p.default_tuition_per_credit)}</td>
                <td className="px-4 py-2">{p.credits_total}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.active ? "Active" : "Retired"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  {profile.role === "admin" && (
                    <>
                      <Link href={`/programs/${p.id}`} className="text-slate-600 hover:text-slate-900">
                        Edit
                      </Link>
                      <form
                        action={toggleProgramActive.bind(null, p.id, !p.active)}
                        className="inline"
                      >
                        <button type="submit" className="text-slate-600 hover:text-slate-900">
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
  );
}
