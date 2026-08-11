import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("approved").eq("id", user.id).single();
  if (profile?.approved) redirect("/classes");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex bg-white rounded-2xl shadow-lg p-6 mb-6">
          <Image src="/logo.png" alt="SABER College" width={220} height={220} className="h-24 w-auto" priority />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-3">
          <h1 className="font-semibold text-brand-navy text-lg">Account pending approval</h1>
          <p className="text-sm text-slate-600">
            Your email is confirmed, but an administrator still needs to approve your account before you can sign
            in. You&apos;ll be able to access the app as soon as that happens.
          </p>
          <p className="text-xs text-slate-400">Signed in as {user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium py-2.5 hover:bg-brand-navy/5 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
