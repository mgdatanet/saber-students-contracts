"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="shrink-0 rounded-lg border border-brand-navy/30 text-brand-navy text-sm font-medium px-4 py-2.5 hover:bg-brand-navy/5 print:hidden transition-colors"
    >
      Print
    </button>
  );
}
