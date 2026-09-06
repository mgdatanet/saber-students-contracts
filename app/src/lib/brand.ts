// Brand identity for the billing-facing pages introduced with Stripe gating
// (payment-required, and anywhere else billing UI needs the school's name or
// logo). Colors aren't here — they're Tailwind theme tokens in globals.css
// (--color-brand-navy, --color-brand-blue, --color-brand-gold), already a
// single source of truth.
export const BRAND = {
  name: "SABER College",
  logoSrc: "/logo.png",
} as const;
