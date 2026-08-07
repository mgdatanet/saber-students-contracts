import { createClient } from "@/lib/supabase/server";
import { createSigner, toggleSignerActive } from "@/lib/actions/signers";

export default async function SignersPage() {
  const supabase = await createClient();
  const { data: signers } = await supabase.from("signers").select("*").order("full_name");

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Signers</h1>
        <p className="text-sm text-slate-500">
          People who can appear as &ldquo;Accepted by:&rdquo; on a contract. A class picks one when it&apos;s
          created.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {signers?.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{s.full_name}</td>
                <td className="px-4 py-2">{s.title}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      s.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.active ? "Active" : "Retired"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleSignerActive.bind(null, s.id, !s.active)}>
                    <button type="submit" className="text-slate-600 hover:text-slate-900">
                      {s.active ? "Retire" : "Reactivate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createSigner} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Full name</label>
          <input name="full_name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Title</label>
          <input name="title" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
        >
          Add
        </button>
      </form>
    </div>
  );
}
