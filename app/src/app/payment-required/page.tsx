import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { isSubscriptionGatingEnabled } from "@/lib/subscriptionGating";
import { effectiveStatus, hasPlatformAccess } from "@/lib/billing/status";
import { BRAND } from "@/lib/brand";

// Intentionally outside the (app) route group: that layout is what redirects
// here when the subscription isn't active, so if this page lived inside it
// too, every visit would immediately redirect back to itself.
export default async function PaymentRequiredPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, approved").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!profile.approved) redirect("/pending-approval");

  // Nothing left to do here if the gate is off, the caller is admin, or the
  // subscription is actually active — send them back in.
  if (!isSubscriptionGatingEnabled() || profile.role === "admin") {
    redirect("/classes");
  }

  const { data: subscription } = await supabase
    .from("subscription")
    .select("internal_status, status, grace_period_ends_at")
    .eq("id", "primary")
    .single();

  // The grace period counts as access, so a staff member who lands here during
  // the margin is sent straight back into the app.
  const status = effectiveStatus(subscription);
  if (hasPlatformAccess(status)) redirect("/classes");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex bg-white rounded-2xl shadow-lg p-6 mb-6">
          <Image src={BRAND.logoSrc} alt={BRAND.name} width={220} height={220} className="h-24 w-auto" priority />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-3">
          <h1 className="font-semibold text-brand-navy text-lg">Payment required</h1>
          <p className="text-sm text-slate-600">
            {status === "CANCELED"
              ? "Access to the platform is paused because the subscription has been canceled."
              : "Access to the platform is temporarily paused because there is an outstanding payment on the subscription."}{" "}
            Your data has not been affected — nothing has been deleted, and access is restored automatically
            once the subscription is up to date.
          </p>
          <p className="text-sm text-slate-600">
            Please contact an administrator to resolve the account&apos;s billing status.
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
