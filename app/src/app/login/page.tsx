import Image from "next/image";
import { signIn, signUp } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="SABER College" width={64} height={64} className="mx-auto mb-2 h-16 w-auto" priority />
          <h1 className="text-xl font-semibold text-slate-900">SABER College</h1>
          <p className="text-sm text-slate-500">Student Enrollment Agreements</p>
        </div>

        {params.error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        )}
        {params.message && (
          <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
            {params.message}
          </div>
        )}

        <form action={signIn} className="space-y-3 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="font-medium text-slate-900 mb-2">Sign in</h2>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800"
          >
            Sign in
          </button>
        </form>

        <details className="mt-4 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <summary className="font-medium text-slate-900 cursor-pointer">Create an account</summary>
          <form action={signUp} className="space-y-3 mt-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Full name</label>
              <input
                name="fullName"
                type="text"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md border border-slate-300 text-slate-700 text-sm font-medium py-2 hover:bg-slate-50"
            >
              Sign up
            </button>
            <p className="text-xs text-slate-400">
              New accounts start as staff. Ask an admin to grant admin access if you need to manage programs.
            </p>
          </form>
        </details>
      </div>
    </main>
  );
}
