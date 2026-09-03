import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { ACTIVE_SUBSCRIPTION_STATUSES, isSubscriptionGatingEnabled } from "@/lib/subscriptionGating";

// Intentionally outside the (app) route group: that layout is what redirects
// here when the subscription isn't active, so if this page lived inside it
// too, every visit would immediately redirect back to itself.
export default async function PagoRequeridoPage() {
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

  const { data: subscription } = await supabase.from("subscription").select("status").eq("id", "primary").single();
  const isActive = !!subscription && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
  if (isActive) redirect("/classes");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-navy to-brand-blue px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex bg-white rounded-2xl shadow-lg p-6 mb-6">
          <Image src="/logo.png" alt="SABER College" width={220} height={220} className="h-24 w-auto" priority />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-3">
          <h1 className="font-semibold text-brand-navy text-lg">Pago pendiente</h1>
          <p className="text-sm text-slate-600">
            El acceso a la plataforma está temporalmente suspendido porque hay un pago pendiente en la suscripción.
            Un administrador debe resolver el estado de la cuenta para restablecer el acceso.
          </p>
          <p className="text-xs text-slate-400">Sesión iniciada como {user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium py-2.5 hover:bg-brand-navy/5 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
