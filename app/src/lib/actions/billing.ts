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
export interface OpenInvoice {
  /** Stripe's hosted payment page for the invoice. */
  url: string;
  amountDue: string;
  number: string | null;
}

/**
 * The outstanding invoice, when there is one.
 *
 * On a healthy subscription this is always null: Stripe charges the card on
 * file and nothing is ever left to pay by hand. It fills in when a charge
 * fails — an expired card, a bank decline — which is the one moment someone
 * needs a way to settle the bill themselves instead of waiting for whoever
 * has the Stripe login.
 */
export async function getOpenInvoice(): Promise<OpenInvoice | null> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return null;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscription")
    .select("stripe_customer_id")
    .eq("id", "primary")
    .single();

  if (!subscription?.stripe_customer_id) return null;

  try {
    const stripe = new Stripe(secretKey);
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      status: "open",
      limit: 1,
    });

    const invoice = invoices.data[0];
    if (!invoice?.hosted_invoice_url) return null;

    return {
      url: invoice.hosted_invoice_url,
      amountDue: (invoice.amount_due / 100).toLocaleString("en-US", { style: "currency", currency: "usd" }),
      number: invoice.number,
    };
  } catch (e) {
    // Billing being unreachable must not take the Users page down with it.
    console.error("Could not read the open invoice from Stripe", e);
    return null;
  }
}

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
