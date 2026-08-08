"use client";

import { useRef, useState, useTransition } from "react";
import { saveContractDesign, previewContractDesign } from "@/lib/actions/contractDesign";
import { FONT_FAMILY_OPTIONS, type ContractTheme } from "@/lib/contractTheme";

interface TextBlockRow {
  key: string;
  label: string;
  content: string;
}

export function ContractDesignForm({
  textBlocks,
  theme,
}: {
  textBlocks: TextBlockRow[];
  theme: ContractTheme;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPreviewPending, startPreview] = useTransition();
  const [previewError, setPreviewError] = useState<string | null>(null);

  function handlePreview() {
    if (!formRef.current) return;
    setPreviewError(null);
    const formData = new FormData(formRef.current);
    startPreview(async () => {
      const result = await previewContractDesign(formData);
      if (result.error || !result.pdfBase64) {
        setPreviewError(result.error ?? "Could not generate preview");
        return;
      }
      const byteChars = atob(result.pdfBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob), "_blank");
    });
  }

  return (
    <form ref={formRef} action={saveContractDesign} className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-slate-900 mb-1">Appearance</h2>
        <p className="text-xs text-slate-500 mb-4">
          Colors, font, and logo size. The legal layout (TILA disclosure boxes, payment schedule table, page
          structure) is fixed and cannot be changed here, so a visual tweak can never break federal compliance
          formatting.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Section header background</label>
            <input type="color" name="primary_color" defaultValue={theme.primaryColor} className="h-9 w-14 rounded border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Section header text color</label>
            <input
              type="color"
              name="section_title_text_color"
              defaultValue={theme.sectionTitleTextColor}
              className="h-9 w-14 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Table border color</label>
            <input type="color" name="border_color" defaultValue={theme.borderColor} className="h-9 w-14 rounded border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Font</label>
            <select name="font_family" defaultValue={theme.fontFamily} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {FONT_FAMILY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Base font size (pt)</label>
            <input
              type="number"
              name="base_font_size_pt"
              defaultValue={theme.baseFontSizePt}
              min={7}
              max={12}
              step="0.5"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Logo max height (px)</label>
            <input
              type="number"
              name="logo_max_height_px"
              defaultValue={theme.logoMaxHeightPx}
              min={20}
              max={150}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Contract Text</h2>
          <p className="text-xs text-slate-500">
            The legal boilerplate printed on every contract. Basic HTML is supported (e.g. &lt;strong&gt;,
            &lt;ul&gt;&lt;li&gt;, &lt;br/&gt;). Tokens like <code>{"{{MIN_GRADE_PCT}}"}</code> are replaced
            automatically with each class&apos;s real values.
          </p>
        </div>
        {textBlocks.map((b) => (
          <details key={b.key} className="bg-white border border-slate-200 rounded-lg p-4">
            <summary className="text-sm font-medium text-slate-900 cursor-pointer">{b.label}</summary>
            <textarea
              name={`text_${b.key}`}
              defaultValue={b.content}
              rows={8}
              className="w-full mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </details>
        ))}
      </section>

      <div className="flex items-center gap-3 sticky bottom-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <button type="submit" className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800">
          Save All Changes
        </button>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewPending}
          className="rounded-md border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-white disabled:opacity-50"
        >
          {isPreviewPending ? "Generating preview…" : "Preview Sample Contract"}
        </button>
        {previewError && <span className="text-sm text-red-600">{previewError}</span>}
        <span className="text-xs text-slate-400">Preview uses a sample student — nothing is saved by previewing.</span>
      </div>
    </form>
  );
}
