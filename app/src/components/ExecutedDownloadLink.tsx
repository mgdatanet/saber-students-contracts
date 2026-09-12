"use client";

import { useState, useTransition } from "react";
import { getExecutedPdfUrl } from "@/lib/actions/signing";

/** Opens the fully executed copy — the contract plus its signature certificate. */
export function ExecutedDownloadLink({ contractId }: { contractId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const url = await getExecutedPdfUrl(contractId);
      if (url) window.open(url, "_blank");
      else setError("Could not open PDF");
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={open}
        disabled={isPending}
        className="text-sm font-medium text-brand-blue hover:text-brand-navy"
      >
        {isPending ? "Opening…" : "Signed copy"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
