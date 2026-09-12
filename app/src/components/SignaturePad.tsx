"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";

export type SignaturePadHandle = {
  /** The drawn signature as a PNG data URL. */
  toDataURL: () => string | null;
  clear: () => void;
};

/**
 * A draw-your-signature box. Shared by the student's public signing page and
 * the school's countersigning queue so both signatures are captured — and
 * scaled for high-DPI screens — exactly the same way.
 */
export function SignaturePad({
  ref,
  onInkChange,
  placeholder = "Sign here",
  className = "h-45",
}: {
  ref?: RefObject<SignaturePadHandle | null>;
  onInkChange?: (hasInk: boolean) => void;
  placeholder?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

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
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const setInk = useCallback(
    (value: boolean) => {
      setHasInk(value);
      onInkChange?.(value);
    },
    [onInkChange],
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setInk(false);
  }, [setInk]);

  useImperativeHandle(
    ref,
    () => ({
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? null,
      clear,
    }),
    [clear],
  );

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
    if (!hasInk) setInk(true);
  }

  function endStroke() {
    drawing.current = false;
    last.current = null;
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border-[1.5px] border-dashed border-slate-300 bg-slate-50 ${className}`}>
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
          {placeholder}
        </div>
      )}
    </div>
  );
}
