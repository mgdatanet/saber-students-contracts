"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Stripe from "stripe";
import { requireProfile } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends an admin to Stripe's hosted Customer Portal for the school's single
 * subscription — manage the card on file, view invoices, cancel. Admin-only
 * regardless of SUBSCRIPTION_GATING_ENABLED: billing management shouldn't
 * depend on the gate being live.
 */
export async function openBillingPortal() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") throw new Error("Only admins can manage billing");

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    redirect(`/users?error=${encodeURIComponent("Stripe is not configured.")}`);
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscription")
    .select("stripe_customer_id")
    .eq("id", "primary")
    .single();

  if (!subscription?.stripe_customer_id) {
    redirect(`/users?error=${encodeURIComponent("No Stripe customer is set up yet.")}`);
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;

  const stripe = new Stripe(secretKey);
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/users`,
  });

  redirect(session.url);
}
