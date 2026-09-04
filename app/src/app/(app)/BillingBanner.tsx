import { graceDaysRemaining, type InternalStatus } from "@/lib/billing/status";

// Dates are formatted in UTC, which is how they are stored. The deadline is a
// whole number of days after a payment failure, so it never lands near a
// midnight boundary where the local date would differ.
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", DATE_FORMAT);
}

/**
 * The strip at the top of every page while billing needs attention.
 *
 * Renders nothing when the subscription is healthy, and nothing at all when the
 * gate is off — the caller decides that. Staff never see the suspended variants
 * because the layout redirects them to /payment-required first; those exist for
 * admins, who keep working and are the only ones who can fix it.
 */
export default function BillingBanner({
  status,
  gracePeriodEndsAt,
  isAdmin,
}: {
  status: InternalStatus;
  gracePeriodEndsAt: string | null;
  isAdmin: boolean;
}) {
  if (status === "ACTIVE") return null;

  if (status === "PAST_DUE") {
    const daysLeft = graceDaysRemaining(gracePeriodEndsAt);
    const deadline = gracePeriodEndsAt ? formatDate(gracePeriodEndsAt) : null;

    return (
      <div className="print:hidden border-b border-amber-300 bg-amber-50 text-amber-900">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-2.5 flex items-start gap-2.5 text-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 shrink-0 mt-px"
            aria-hidden="true"
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <p>
            <span className="font-semibold">
              {daysLeft === 0
                ? "A payment on the subscription failed. Access ends today."
                : `A payment on the subscription failed. Access continues for ${daysLeft} more ${daysLeft === 1 ? "day" : "days"}.`}
            </span>{" "}
            {deadline ? `Everyone except administrators loses access on ${deadline}. ` : ""}
            {isAdmin
              ? "Update the payment method to restore the subscription."
              : "Please let an administrator know."}
          </p>
        </div>
      </div>
    );
  }

  const message =
    status === "CANCELED"
      ? "The subscription is canceled. Only administrators can sign in."
      : "The subscription is unpaid and staff access is suspended. Only administrators can sign in.";

  return (
    <div className="print:hidden border-b border-red-300 bg-red-50 text-red-900">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-2.5 flex items-start gap-2.5 text-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 shrink-0 mt-px"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5M12 16h.01" />
        </svg>
        <p>
          <span className="font-semibold">{message}</span>{" "}
          {isAdmin ? "No data has been deleted; access returns as soon as the subscription is paid." : ""}
        </p>
      </div>
    </div>
  );
}
