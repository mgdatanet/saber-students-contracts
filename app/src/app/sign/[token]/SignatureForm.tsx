"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitStudentSignature } from "@/lib/actions/signing";

export function SignatureForm({
  token,
  studentName,
  alreadySigned,
}: {
  token: string;
  studentName: string;
  alreadySigned: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [hasInk, setHasInk] = useState(false);
  const [consented, setConsented] = useState(false);
  const [signed, setSigned] = useState(alreadySigned);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Canvas pixels must track CSS pixels or the drawn line lands off the cursor.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#16233A";
  }, []);

  useEffect(() => {
    if (signed) return;
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize, signed]);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFrom(e);
  }

  function drawStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const point = pointFrom(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    last.current = point;
    if (!hasInk) setHasInk(true);
  }

  function endStroke() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function submit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);

    const dataUrl = canvas.toDataURL("image/png");
    startTransition(async () => {
      const result = await submitStudentSignature(token, dataUrl);
      if (result.error) setError(result.error);
      else setSigned(true);
    });
  }

  if (signed) {
    return (
      <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Signed successfully
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-slate-600">
          Thanks, {studentName}. SABER College&apos;s Financial Aid office has been notified and will countersign
          your agreement shortly. You&apos;ll receive the fully executed copy by email once that&apos;s complete.
        </p>
      </div>
    );
  }

  const ready = hasInk && consented;

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h3 className="font-semibold text-brand-navy">Your signature</h3>
      <p className="mb-3.5 text-sm text-slate-500">
        Draw your signature in the box below using your mouse, stylus, or finger.
      </p>

      <div className="relative h-45 overflow-hidden rounded-xl border-[1.5px] border-dashed border-slate-300 bg-slate-50">
        <canvas
          ref={canvasRef}
          onPointerDown={startStroke}
          onPointerMove={drawStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          aria-label="Signature drawing area"
          className="size-full cursor-crosshair touch-none"
        />
        <div className="pointer-events-none absolute inset-x-4 bottom-9.5 h-px bg-slate-300" />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] italic text-slate-400">
            Sign here
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {studentName} &middot;{" "}
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          Clear
        </button>
      </div>

      <label className="mt-4.5 flex items-start gap-2.5 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 size-4.5 shrink-0 accent-brand-blue"
        />
        <span>
          <strong className="text-slate-900">I agree</strong> this electronic signature is legally binding and
          equivalent to my handwritten signature on this enrollment agreement.
        </span>
      </label>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 size-3.5 shrink-0 text-brand-blue">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          For your protection, we record the date, time, and IP address of this signature as part of the signed
          contract&apos;s audit trail.
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={submit}
          disabled={!ready || isPending}
          className="rounded-lg bg-brand-blue px-6 py-3 text-[15px] font-bold text-white shadow-sm transition hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending ? "Submitting…" : "Sign & submit agreement"}
        </button>
        <span className="text-sm text-slate-500">
          {ready ? "Ready to sign" : !hasInk ? "Draw your signature and check the box to continue" : "Check the box to confirm and continue"}
        </span>
      </div>
    </div>
  );
}
