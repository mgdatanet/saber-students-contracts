"use client";

import { useState, useTransition } from "react";
import { getContractDownloadUrl } from "@/lib/actions/contracts";

export function DownloadContractLink({ pdfPath }: { pdfPath: string | null }) {
  const [isPreviewPending, startPreview] = useTransition();
  const [isDownloadPending, startDownload] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!pdfPath) return <span className="text-slate-400 text-sm">Rendering…</span>;

  function openUrl(forceDownload: boolean, start: typeof startPreview) {
    setError(null);
    start(async () => {
      const url = await getContractDownloadUrl(pdfPath!, forceDownload);
      if (url) window.open(url, "_blank");
      else setError("Could not open PDF");
    });
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={() => openUrl(false, startPreview)}
        disabled={isPreviewPending}
        className="text-slate-600 hover:text-slate-900 text-sm"
      >
        {isPreviewPending ? "Opening…" : "Preview"}
      </button>
      <button
        type="button"
        onClick={() => openUrl(true, startDownload)}
        disabled={isDownloadPending}
        className="text-slate-600 hover:text-slate-900 text-sm"
      >
        {isDownloadPending ? "Opening…" : "Download PDF"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
