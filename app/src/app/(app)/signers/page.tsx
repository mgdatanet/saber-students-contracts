import { createClient } from "@/lib/supabase/server";
import { createSigner, toggleSignerActive } from "@/lib/actions/signers";

export default async function SignersPage() {
  const supabase = await createClient();
  const { data: signers } = await supabase.from("signers").select("*").order("full_name");

  const totalSigners = signers?.length ?? 0;
  const activeSigners = signers?.filter((s) => s.active).length ?? 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Signers</h1>
        <p className="text-sm text-slate-500">
          People who can appear as &ldquo;Accepted by:&rdquo; on a contract. A class picks one when it&apos;s
          created.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Signers" value={totalSigners} />
        <StatCard label="Active" value={activeSigners} accent="text-emerald-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {signers?.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-brand-navy/5 transition-colors">
                  <td className="px-5 py-3 font-medium text-brand-navy">{s.full_name}</td>
                  <td className="px-5 py-3">{s.title}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                        s.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.active ? "Active" : "Retired"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={toggleSignerActive.bind(null, s.id, !s.active)}>
                      <button type="submit" className="text-brand-navy hover:underline">
                        {s.active ? "Retire" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={createSigner} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Full name</label>
          <input
            name="full_name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Title</label>
          <input
            name="title"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
        >
          Add
        </button>
      </form>
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
