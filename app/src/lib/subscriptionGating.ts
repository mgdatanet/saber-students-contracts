// Master switch for the Stripe payment gate. Unset (or any value other than
// "true") in Vercel means the gate never blocks anyone, regardless of what
// the `subscription` row says — flip it on only after verifying the Stripe
// webhook is live and in sync.
export function isSubscriptionGatingEnabled() {
  return process.env.SUBSCRIPTION_GATING_ENABLED === "true";
}

// Which statuses grant access is no longer decided here: Stripe's status is
// mapped to an internal one in src/lib/billing/status.ts, which also applies
// the grace period. This file is only the master switch.
