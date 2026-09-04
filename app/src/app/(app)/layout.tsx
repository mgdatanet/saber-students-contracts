import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { isSubscriptionGatingEnabled } from "@/lib/subscriptionGating";
import { effectiveStatus, hasPlatformAccess, type InternalStatus } from "@/lib/billing/status";
import BillingBanner from "./BillingBanner";

type NavItem = { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean };

// Minimal inline stroke icons (no icon library dependency) matching the
// sidebar nav in the approved brand mockup.
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
    </svg>
  );
}
function IconSignature() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M3 17s2-1 4-1 3 2 5 2 3-4 5-4 4 2 4 2" />
      <path d="M3 21h18" />
    </svg>
  );
}
function IconDocEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <path d="M14 3v5h5" />
      <path d="m14.5 12.5 3 3L20 13l-3-3-2.5 2.5Z" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.25 3.25 0 0 1 0 6.3M21.5 20a6 6 0 0 0-5-5.9" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/classes", label: "Classes", icon: <IconLayers /> },
  { href: "/reports", label: "Reports", icon: <IconChart /> },
  { href: "/programs", label: "Programs", icon: <IconBook />, adminOnly: true },
  { href: "/signers", label: "Signers", icon: <IconSignature />, adminOnly: true },
  { href: "/contract-editor", label: "Contract Editor", icon: <IconDocEdit />, adminOnly: true },
  { href: "/users", label: "Users", icon: <IconUsers />, adminOnly: true },
  { href: "/history", label: "History", icon: <IconClock /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  // Payment gate: admins always get in (they're the ones who need to fix
  // billing). Disabled by default via SUBSCRIPTION_GATING_ENABLED — see
  // src/lib/subscriptionGating.ts.
  //
  // The row is read for everyone, not just staff, because the banner below is
  // how an admin finds out the grace period is running out.
  let billingStatus: InternalStatus = "ACTIVE";
  let gracePeriodEndsAt: string | null = null;

  if (isSubscriptionGatingEnabled()) {
    const supabase = await createClient();
    const { data: subscription } = await supabase
      .from("subscription")
      .select("internal_status, status, grace_period_ends_at")
      .eq("id", "primary")
      .single();

    // PAST_DUE lapses into PAUSED when the grace period expires; that is
    // decided here, on the read, so no scheduled job is needed.
    billingStatus = effectiveStatus(subscription);
    gracePeriodEndsAt = subscription?.grace_period_ends_at ?? null;

    if (!hasPlatformAccess(billingStatus) && profile.role !== "admin") redirect("/payment-required");
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || profile.role === "admin");

  return (
    <div className="min-h-screen md:flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 print:hidden bg-gradient-to-b from-brand-navy to-brand-blue text-white">
        <div className="p-5">
          <div className="rounded-xl bg-white/95 p-3 flex justify-center">
            <Image src="/logo.png" alt="SABER College" width={200} height={200} className="h-24 w-auto" priority />
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/15">
          <div className="text-sm font-medium truncate">{profile.full_name}</div>
          <div className="text-xs uppercase tracking-wide text-brand-gold">{profile.role}</div>
          <form action={signOut} className="mt-3">
            <button className="text-xs text-white/70 hover:text-white transition-colors">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden print:hidden bg-gradient-to-r from-brand-navy to-brand-blue text-white">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/classes" className="flex items-center gap-2 font-semibold">
            <Image src="/logo.png" alt="SABER College" width={40} height={40} className="h-9 w-auto bg-white rounded p-0.5" priority />
          </Link>
          <span className="text-xs text-white/80 truncate">{profile.full_name}</span>
        </div>
        <nav className="flex items-center gap-1 px-3 pb-2 overflow-x-auto text-sm">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-white/85 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex-1 min-w-0">
        <BillingBanner
          status={billingStatus}
          gracePeriodEndsAt={gracePeriodEndsAt}
          isAdmin={profile.role === "admin"}
        />
        <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
