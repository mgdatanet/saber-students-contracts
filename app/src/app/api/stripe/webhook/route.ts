import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe's signature verification needs the raw request body, so this route
// must run on Node (Edge doesn't expose the crypto APIs `stripe` needs) and
// must never run through a JSON body parser before constructEvent() below.
export const runtime = "nodejs";

const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

async function syncFromSubscription(stripe: Stripe, sub: Stripe.Subscription) {
  const supabaseAdmin = createAdminClient();

  await supabaseAdmin
    .from("subscription")
    .update({
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: sub.items.data[0]?.price.id ?? null,
      current_period_end: new Date(sub.items.data[0].current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "primary");
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

  if (!signature) {
    return new Response("Falta la firma de Stripe", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Firma inválida: ${(err as Error).message}`, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return new Response("ok", { status: 200 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncFromSubscription(stripe, event.data.object as Stripe.Subscription);
      break;

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      const subId = typeof subscriptionId === "string" ? subscriptionId : subscriptionId?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncFromSubscription(stripe, sub);
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
