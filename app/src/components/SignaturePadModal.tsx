"use client";

import { useRef, useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

/**
 * Asks for one drawn mark — a full signature or a set of initials — once.
 * The same mark is then reused everywhere that kind of box appears, the way
 * you adopt a signature once before initialling a stack of pages.
 */
export function SignaturePadModal({
  kind,
  signerName,
  onAdopt,
  onCancel,
}: {
  kind: "initials" | "signature";
  signerName: string;
  onAdopt: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const pad = useRef<SignaturePadHandle>(null);
  const [hasInk, setHasInk] = useState(false);

  const isInitials = kind === "initials";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-brand-navy">
          {isInitials ? "Draw your initials" : "Draw your signature"}
        </h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-slate-500">
          {isInitials
            ? "You only do this once. You'll then place these initials on each box as you read through the agreement."
            : "Draw your full signature using your mouse, stylus, or finger."}
        </p>

        <SignaturePad
          ref={pad}
          onInkChange={setHasInk}
          placeholder={isInitials ? "Your initials" : "Sign here"}
          className={isInitials ? "h-36" : "h-44"}
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">{signerName}</span>
          <button
            type="button"
            onClick={() => pad.current?.clear()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            Clear
          </button>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasInk}
            onClick={() => {
              const dataUrl = pad.current?.toDataURL();
              if (dataUrl) onAdopt(dataUrl);
            }}
            className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isInitials ? "Adopt initials" : "Adopt signature"}
          </button>
        </div>
      </div>
    </div>
  );
}
