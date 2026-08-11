import Image from "next/image";
import { signIn, signUp } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex bg-white rounded-2xl shadow-lg p-4">
            <Image src="/logo.png" alt="SABER College" width={64} height={64} className="h-16 w-auto" priority />
          </div>
          <p className="mt-4 text-sm text-white/80">Student Enrollment Agreements</p>
        </div>

        {params.error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        )}
        {params.message && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
            {params.message}
          </div>
        )}

        <form action={signIn} className="space-y-3 bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="font-semibold text-brand-navy mb-2">Sign in</h2>
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
            <label className="block text-sm text-slate-600 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-navy text-white text-sm font-medium py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
          >
            Sign in
          </button>
        </form>

        <details className="mt-4 bg-white rounded-2xl p-6 shadow-lg">
          <summary className="font-semibold text-brand-navy cursor-pointer">Create an account</summary>
          <form action={signUp} className="space-y-3 mt-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Full name</label>
              <input
                name="fullName"
                type="text"
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
              <label className="block text-sm text-slate-600 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium py-2.5 hover:bg-brand-navy/5 transition-colors"
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
