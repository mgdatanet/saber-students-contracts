import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  gracePeriodDaysFromEnv,
  isInternalStatus,
  resolveGracePeriodEnd,
  toInternalStatus,
} from "@/lib/billing/status";

// Stripe's signature verification needs the raw request body, so this route
// must run on Node (Edge doesn't expose the crypto APIs `stripe` needs) and
// must never run through a JSON body parser before constructEvent() below.
//
// This route is deliberately excluded from the session middleware in
// src/proxy.ts: Stripe arrives without a Supabase session and would otherwise
// be redirected to /login. Its protection is the HMAC signature check, which
// is stronger than a session cookie.
export const runtime = "nodejs";

const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

// A claim left in "processing" for longer than this is assumed to be a crashed
// attempt and may be taken over by a retry.
const STUCK_CLAIM_MS = 5 * 60 * 1000;

type Outcome =
  | "applied"
  | "ignored_other_tenant"
  | "ignored_stale"
  | "ignored_no_subscription"
  | "ignored_no_period";

type Admin = ReturnType<typeof createAdminClient>;

/** Resolve the Subscription this event is about, re-fetching from the API so we
 *  never depend on the shape the webhook endpoint's API version happened to send. */
async function resolveSubscription(stripe: Stripe, event: Stripe.Event): Promise<Stripe.Subscription | null> {
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    return stripe.subscriptions.retrieve(sub.id);
  }

  const invoice = event.data.object as Stripe.Invoice;
  const ref = invoice.parent?.subscription_details?.subscription;
  const subId = typeof ref === "string" ? ref : ref?.id;
  if (!subId) return null;

  return stripe.subscriptions.retrieve(subId);
}

async function applyEvent(stripe: Stripe, event: Stripe.Event, supabaseAdmin: Admin): Promise<Outcome> {
  const sub = await resolveSubscription(stripe, event);
  if (!sub) return "ignored_no_subscription";

  const { data: row } = await supabaseAdmin
    .from("subscription")
    .select(
      "stripe_subscription_id, last_event_at, internal_status, grace_period_ends_at, paused_at, last_payment_at, last_payment_failed_at",
    )
    .eq("id", "primary")
    .single();

  // Every deployment of this app shares one Stripe account, so it receives the
  // events of every tenant. Only touch the row if the event belongs to *this*
  // installation's subscription. STRIPE_SUBSCRIPTION_ID pins it explicitly;
  // otherwise the first subscription we ever see claims the row.
  const pinned = process.env.STRIPE_SUBSCRIPTION_ID?.trim() || row?.stripe_subscription_id;
  if (pinned && pinned !== sub.id) return "ignored_other_tenant";

  // Stripe does not guarantee delivery order, and a retry can land an hour late
  // carrying stale state. Never let an older event overwrite a newer one.
  const eventAt = new Date(event.created * 1000);
  if (row?.last_event_at && new Date(row.last_event_at) >= eventAt) return "ignored_stale";

  // A subscription with no items would make `current_period_end` undefined and
  // throw on toISOString(), turning this into a 500 and an endless retry loop.
  const item = sub.items.data[0];
  const periodEnd =
    item && typeof item.current_period_end === "number"
      ? new Date(item.current_period_end * 1000).toISOString()
      : null;

  // Stripe's status is stored as it arrives, but everything downstream reads
  // the internal one. See src/lib/billing/status.ts.
  const internalStatus = toInternalStatus(sub.status);

  const lastPaymentAt =
    event.type === "invoice.paid" ? eventAt.toISOString() : (row?.last_payment_at ?? null);

  // The failure timestamp is the anchor of the grace period, so it is cleared
  // the moment the subscription is paid up again: otherwise a failure months
  // later would inherit a stale anchor and expire its margin instantly.
  const lastPaymentFailedAt =
    event.type === "invoice.payment_failed"
      ? eventAt.toISOString()
      : internalStatus === "ACTIVE"
        ? null
        : (row?.last_payment_failed_at ?? null);

  const gracePeriodEndsAt = resolveGracePeriodEnd({
    internalStatus,
    previousInternalStatus: isInternalStatus(row?.internal_status) ? row.internal_status : null,
    previousGracePeriodEnd: row?.grace_period_ends_at ?? null,
    failedAt: lastPaymentFailedAt ? new Date(lastPaymentFailedAt) : eventAt,
    graceDays: gracePeriodDaysFromEnv(),
  });

  // Only Stripe pausing the subscription is recorded here. A pause caused by an
  // expired grace period is derived on read and has no event to timestamp.
  const pausedAt = internalStatus === "PAUSED" ? (row?.paused_at ?? eventAt.toISOString()) : null;

  const { error } = await supabaseAdmin
    .from("subscription")
    .update({
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      internal_status: internalStatus,
      grace_period_ends_at: gracePeriodEndsAt,
      paused_at: pausedAt,
      last_payment_at: lastPaymentAt,
      last_payment_failed_at: lastPaymentFailedAt,
      price_id: item?.price.id ?? null,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      last_event_at: eventAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "primary");

  if (error) throw new Error(`No se pudo actualizar la suscripción: ${error.message}`);

  return periodEnd ? "applied" : "ignored_no_period";
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    console.error("Stripe webhook called but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are not configured");
    return new Response("Stripe no está configurado", { status: 500 });
  }

  const stripe = new Stripe(secretKey);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Falta la firma de Stripe", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // Bad signature is the caller's problem, never ours: 400 so Stripe stops retrying.
    return new Response(`Firma inválida: ${(err as Error).message}`, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) return new Response("ok", { status: 200 });

  const supabaseAdmin = createAdminClient();

  // Claim the event. The UNIQUE constraint on (provider, provider_event_id) is
  // what makes this idempotent: a duplicate delivery loses the race and exits.
  const { error: claimError } = await supabaseAdmin.from("billing_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    processing_status: "processing",
  });

  if (claimError) {
    if (claimError.code !== "23505") {
      console.error("No se pudo registrar el evento de facturación", claimError);
      return new Response("Error registrando el evento", { status: 500 });
    }

    const { data: existing } = await supabaseAdmin
      .from("billing_events")
      .select("processing_status, received_at")
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id)
      .single();

    const stuck =
      existing?.processing_status === "processing" &&
      Date.now() - new Date(existing.received_at).getTime() > STUCK_CLAIM_MS;

    // Already handled (or being handled right now): acknowledge and do nothing.
    if (!stuck && existing?.processing_status !== "failed") {
      return new Response("duplicate", { status: 200 });
    }
    // Otherwise fall through and reprocess: a previous attempt failed or died.
  }

  try {
    const outcome = await applyEvent(stripe, event, supabaseAdmin);

    await supabaseAdmin
      .from("billing_events")
      .update({ processing_status: "processed", outcome, processed_at: new Date().toISOString(), error: null })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);

    return new Response(outcome, { status: 200 });
  } catch (err) {
    const message = (err as Error).message;
    console.error(`Fallo procesando ${event.type} (${event.id}): ${message}`);

    await supabaseAdmin
      .from("billing_events")
      .update({ processing_status: "failed", error: message, processed_at: new Date().toISOString() })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);

    // Real failure on our side: 500 so Stripe retries and the claim above is
    // released for the next attempt.
    return new Response("Error procesando el evento", { status: 500 });
  }
}
