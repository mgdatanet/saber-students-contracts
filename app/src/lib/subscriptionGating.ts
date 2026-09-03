// Master switch for the Stripe payment gate. Unset (or any value other than
// "true") in Vercel means the gate never blocks anyone, regardless of what
// the `subscription` row says — flip it on only after verifying the Stripe
// webhook is live and in sync.
export function isSubscriptionGatingEnabled() {
  return process.env.SUBSCRIPTION_GATING_ENABLED === "true";
}

// Subscription statuses that count as "paid up". Everything else
// (past_due, unpaid, canceled, inactive) blocks non-admin users.
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];
