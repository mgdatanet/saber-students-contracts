import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex bg-white rounded-2xl shadow-lg p-6">
            <Image src="/logo.png" alt="SABER College" width={220} height={220} className="h-28 w-auto" priority />
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

        <form action={requestPasswordReset} className="space-y-3 bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="font-semibold text-brand-navy mb-1">Reset your password</h2>
          <p className="text-xs text-slate-500 mb-2">
            Enter your account email and we&apos;ll send you a link to set a new password.
          </p>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-navy text-white text-sm font-medium py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
          >
            Send reset link
          </button>
          <Link href="/login" className="block text-center text-xs text-slate-500 hover:text-brand-navy">
            Back to sign in
          </Link>
        </form>
      </div>
    </main>
  );
}
