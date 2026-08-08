"use client";

import { useState, useTransition } from "react";
import { updateContractTextBlock } from "@/lib/actions/contractText";

export function TextBlockEditor({ blockKey, label, initialContent }: { blockKey: string; label: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("content", content);
    startTransition(async () => {
      const result = await updateContractTextBlock(blockKey, formData);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <details className="bg-white border border-slate-200 rounded-lg p-4" open>
      <summary className="text-sm font-medium text-slate-900 cursor-pointer">{label}</summary>
      <div className="mt-3 space-y-2">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSaved(false);
          }}
          rows={10}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-slate-400">
          Basic HTML is supported (e.g. &lt;strong&gt;, &lt;ul&gt;&lt;li&gt;, &lt;br/&gt;). Tokens like{" "}
          <code>{"{{MIN_GRADE_PCT}}"}</code> are replaced automatically with the class&apos;s real values — don&apos;t
          delete them unless you mean to.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {saved && !isPending && <span className="text-sm text-green-600">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </details>
  );
}
