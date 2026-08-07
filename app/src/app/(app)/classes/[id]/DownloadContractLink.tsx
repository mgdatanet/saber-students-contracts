"use client";

import { useState, useTransition } from "react";
import { getContractDownloadUrl } from "@/lib/actions/contracts";

export function DownloadContractLink({ pdfPath }: { pdfPath: string | null }) {
  const [isPending, startTransition] = useTransition();

  if (!pdfPath) return <span className="text-slate-400 text-sm">Rendering…</span>;

  function handleClick() {
    startTransition(async () => {
      const url = await getContractDownloadUrl(pdfPath!);
      if (url) window.open(url, "_blank");
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-slate-600 hover:text-slate-900 text-sm">
      {isPending ? "Opening…" : "Download PDF"}
    </button>
  );
}
