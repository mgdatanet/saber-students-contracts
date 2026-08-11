"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "no-session" | "saving" | "done";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // The recovery link redirects here with the session in the URL hash
    // fragment (never sent to the server), so @supabase/ssr's browser client
    // parses it client-side on load and fires this event once ready.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
      else setTimeout(() => setStatus((s) => (s === "checking" ? "no-session" : s)), 2000);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setStatus("saving");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/classes"), 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex bg-white rounded-2xl shadow-lg p-6">
            <Image src="/logo.png" alt="SABER College" width={220} height={220} className="h-28 w-auto" priority />
          </div>
          <p className="mt-4 text-sm text-white/80">Student Enrollment Agreements</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-3">
          {status === "checking" && <p className="text-sm text-slate-600">Checking your reset link…</p>}

          {status === "no-session" && (
            <>
              <h2 className="font-semibold text-brand-navy">Link expired or invalid</h2>
              <p className="text-sm text-slate-600">
                This password reset link is no longer valid. Request a new one below.
              </p>
              <Link
                href="/forgot-password"
                className="block text-center rounded-lg bg-brand-navy text-white text-sm font-medium py-2.5 shadow-sm hover:bg-brand-blue transition-colors"
              >
                Request a new link
              </Link>
            </>
          )}

          {(status === "ready" || status === "saving") && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="font-semibold text-brand-navy mb-1">Set a new password</h2>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1">New password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>
              <button
                type="submit"
                disabled={status === "saving"}
                className="w-full rounded-lg bg-brand-navy text-white text-sm font-medium py-2.5 shadow-sm hover:bg-brand-blue disabled:opacity-50 transition-colors"
              >
                {status === "saving" ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}

          {status === "done" && <p className="text-sm text-emerald-600">Password updated. Taking you in…</p>}
        </div>
      </div>
    </main>
  );
}
