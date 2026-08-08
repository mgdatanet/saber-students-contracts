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

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">Everyone with access to this app, and their role.</p>
      </div>

      {(error || loadError) && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error || loadError}
        </div>
      )}

      {!loadError && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{u.fullName}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <UserRoleSelect userId={u.id} role={u.role} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {u.id !== user.id && <DeleteUserButton userId={u.id} email={u.email} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={createUser} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-900">Add User</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Full name</label>
            <input name="full_name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Temporary password</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Role</label>
            <select name="role" defaultValue="staff" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
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
