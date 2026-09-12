"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SlotState = Record<string, string | null>;

/**
 * Shows the real contract, full width, and makes its signature boxes clickable.
 *
 * The document goes in an iframe rather than inline: it carries its own print
 * stylesheet, so isolating it keeps the app's CSS out of the contract and the
 * contract's CSS out of the app, while what the signer sees stays pixel-for-
 * pixel the document that gets rendered to PDF. It is scaled to whatever width
 * the page gives it and grows to its full height, so the whole contract scrolls
 * in the page instead of hiding inside a little inner scrollbar.
 */
export function ContractCanvas({
  html,
  activeSlots,
  stamps,
  onSlotClick,
  focusSlot,
}: {
  html: string;
  /** Slots this signer is expected to fill; everything else is display-only. */
  activeSlots: string[];
  stamps: SlotState;
  onSlotClick?: (slotId: string) => void;
  /** Bumping this scrolls the named slot into view. */
  focusSlot?: { id: string; nonce: number } | null;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [docHeight, setDocHeight] = useState(1100);
  const [ready, setReady] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);

  // `zoom` rather than `transform: scale()`: it shrinks the element's actual
  // layout box, so the page reserves exactly the room the document occupies.
  // A transform leaves the full-size box behind and the wrapper has to guess a
  // height to clip it to — which is what cut the pages off on the phone.
  const scale = fitScale * userZoom;

  // The contract is laid out for US Letter at 96dpi; everything below just
  // scales that fixed page down to whatever width the screen offers.
  const PAGE_WIDTH = 816;

  const measure = useCallback(() => {
    const width = wrapper.current?.clientWidth;
    if (width) setFitScale(Math.min(width / PAGE_WIDTH, 1));

    const doc = frame.current?.contentDocument;
    // documentElement, not body: the contract's pages are floated into place by
    // its print stylesheet and body can settle shorter than what is painted.
    const height = Math.max(doc?.documentElement?.scrollHeight ?? 0, doc?.body?.scrollHeight ?? 0);
    if (height) setDocHeight(height);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // The document is written into the iframe from here rather than through a
  // rendered `srcDoc` attribute: server-rendered, it finishes loading before
  // React attaches the load handler, the event is missed, and the page sits
  // there with its signature boxes inert. Readiness is then polled rather than
  // taken from that one event, so a cached or instant parse cannot lose it
  // either — the document is ready the moment its slots exist.
  useEffect(() => {
    if (frame.current && frame.current.srcdoc !== html) frame.current.srcdoc = html;
  }, [html]);

  useEffect(() => {
    if (ready) return;

    const check = () => {
      const doc = frame.current?.contentDocument;
      if (doc?.querySelector("[data-slot]")) {
        setReady(true);
        measure();
        return true;
      }
      return false;
    };

    if (check()) return;
    const timer = setInterval(() => {
      if (check()) clearInterval(timer);
    }, 120);
    return () => clearInterval(timer);
  }, [ready, measure]);

  // Slot decoration and click handling live inside the iframe document.
  const decorate = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;

    if (!doc.getElementById("slot-ui")) {
      const style = doc.createElement("style");
      style.id = "slot-ui";
      style.textContent = `
        .sig-slot[data-active="1"] {
          cursor: pointer;
          background: #fff6da;
          border-bottom: 2px solid #edb11b;
          position: relative;
        }
        .sig-slot[data-active="1"]:hover { background: #ffeeb8; }
        .sig-slot[data-active="1"][data-filled="0"]::after {
          content: attr(data-prompt);
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8pt;
          font-weight: bold;
          color: #8a6300;
          white-space: nowrap;
          pointer-events: none;
        }
        .sig-slot[data-filled="1"] { background: transparent; border-bottom: 1px solid #000; }
        .sig-slot[data-focused="1"] { outline: 3px solid #4659a3; outline-offset: 2px; }
      `;
      doc.head.appendChild(style);
    }

    for (const element of Array.from(doc.querySelectorAll<HTMLElement>("[data-slot]"))) {
      const id = element.dataset.slot ?? "";
      const active = activeSlots.includes(id);
      element.dataset.active = active ? "1" : "0";
      element.dataset.prompt = element.dataset.slotKind === "initials" ? "Initial here" : "Sign here";

      const stamp = stamps[id];
      element.dataset.filled = stamp ? "1" : "0";
      const current = element.querySelector("img");
      if (stamp && current?.getAttribute("src") !== stamp) {
        element.innerHTML = `<img src="${stamp}" alt="" />`;
      } else if (!stamp && current && active) {
        element.innerHTML = "";
      }

      element.onclick = active && onSlotClick ? () => onSlotClick(id) : null;
    }
  }, [activeSlots, stamps, onSlotClick]);

  useEffect(() => {
    if (ready) decorate();
  }, [ready, decorate]);

  // The contract embeds its fonts, and a page that measured before they landed
  // reflows taller afterwards — which is how the document ended up taller than
  // the box drawn for it, with pages looking cut off and stacked over
  // each other. Watch for every such change instead of measuring once.
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!ready || !doc) return;

    doc.fonts?.ready.then(measure).catch(() => {});

    const observer = new ResizeObserver(measure);
    observer.observe(doc.documentElement);
    if (doc.body) observer.observe(doc.body);

    // Belt and braces for browsers that settle late (iOS Safari resizes an
    // iframe to its content on its own schedule).
    const timers = [250, 1000, 2500].map((delay) => setTimeout(measure, delay));

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [ready, measure]);

  useEffect(() => {
    if (!focusSlot || !ready) return;
    const doc = frame.current?.contentDocument;
    const element = doc?.querySelector<HTMLElement>(`[data-slot="${focusSlot.id}"]`);
    if (!element || !frame.current) return;

    element.dataset.focused = "1";
    // The iframe cannot scroll itself (it is sized to its full content), so the
    // page scrolls to where the slot sits once the scale is applied.
    const top = frame.current.getBoundingClientRect().top + window.scrollY + element.offsetTop * scale;
    window.scrollTo({ top: top - window.innerHeight / 2, behavior: "smooth" });

    const timer = setTimeout(() => delete element.dataset.focused, 2000);
    return () => clearTimeout(timer);
  }, [focusSlot, ready, scale]);

  const zoomedOut = userZoom <= 0.55;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <span className="mr-1 text-xs text-slate-500">Zoom</span>
        <ZoomButton label="Zoom out" disabled={zoomedOut} onClick={() => setUserZoom((z) => Math.max(z - 0.25, 0.5))}>
          &minus;
        </ZoomButton>
        <button
          type="button"
          onClick={() => setUserZoom(1)}
          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Fit
        </button>
        <ZoomButton label="Zoom in" disabled={userZoom >= 3} onClick={() => setUserZoom((z) => Math.min(z + 0.25, 3))}>
          +
        </ZoomButton>
      </div>

      <div
        ref={wrapper}
        className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm"
      >
        <iframe
          ref={frame}
          title="Enrollment agreement"
          scrolling="no"
          onLoad={() => {
            measure();
            setReady(true);
          }}
          style={{
            display: "block",
            width: PAGE_WIDTH,
            height: docHeight,
            border: 0,
            zoom: scale,
          }}
        />
      </div>
    </div>
  );
}

function ZoomButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="size-7 rounded-lg border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
