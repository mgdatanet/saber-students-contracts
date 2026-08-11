import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/actions/profile";
import { listUsers, createUser } from "@/lib/actions/users";
import { UserRoleSelect } from "./UserRoleSelect";
import { DeleteUserButton } from "./DeleteUserButton";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile, user } = await requireProfile();
  if (profile.role !== "admin") redirect("/classes");

  const { error } = await searchParams;

  let users: Awaited<ReturnType<typeof listUsers>> = [];
  let loadError: string | null = null;
  try {
    users = await listUsers();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load users";
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.length - adminCount;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Users</h1>
        <p className="text-sm text-slate-500">Everyone with access to this app, and their role.</p>
      </div>

      {(error || loadError) && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error || loadError}
        </div>
      )}

      {!loadError && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Admins" value={adminCount} accent="text-brand-gold" />
            <StatCard label="Staff" value={staffCount} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-brand-navy/5 transition-colors">
                      <td className="px-5 py-3 font-medium text-brand-navy">{u.fullName}</td>
                      <td className="px-5 py-3">{u.email}</td>
                      <td className="px-5 py-3">
                        <UserRoleSelect userId={u.id} role={u.role} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {u.id !== user.id && <DeleteUserButton userId={u.id} email={u.email} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <form action={createUser} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy">Add User</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Full name</label>
            <input
              name="full_name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Temporary password</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Role</label>
            <select
              name="role"
              defaultValue="staff"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
        >
          Add User
        </button>
        <p className="text-xs text-slate-400">
          The account is created already confirmed — share the temporary password with them directly and ask them to
          change it after signing in.
        </p>
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
