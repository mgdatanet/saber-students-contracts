"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SlotState = Record<string, string | null>;

/** The contract is laid out for US Letter at 96dpi. */
const PAGE_WIDTH = 816;

/** Styling for the clickable boxes, injected alongside the contract's own CSS. */
const SLOT_UI_CSS = `
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

/**
 * Splits the rendered contract into the parts a shadow root needs.
 *
 * `@font-face` is the exception: browsers only honour it from the document
 * itself, so those rules are hoisted out and everything else stays scoped.
 */
function splitContract(html: string): { fontFaces: string; css: string; body: string } {
  const style = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";
  const body = /<body>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? "";

  const fontFaces = (style.match(/@font-face\s*\{[^}]*\}/g) ?? []).join("\n");
  const css = style
    .replace(/@font-face\s*\{[^}]*\}/g, "")
    // Page boxes only mean something in print; on screen they do nothing.
    .replace(/@page\s*\{[^}]*\}/g, "")
    // The contract styles `body`; inside a shadow root that is the wrapper.
    .replace(/(^|\})\s*body\s*\{/, "$1 .contract-body {");

  return { fontFaces, css, body };
}

/** Hoists the contract's embedded fonts into the page, once. */
function useContractFonts(fontFaces: string) {
  useEffect(() => {
    if (!fontFaces) return;
    const id = "contract-fonts";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = fontFaces;
    document.head.appendChild(style);
  }, [fontFaces]);
}

/**
 * Shows the real contract, full width, with its signature boxes clickable.
 *
 * The document is mounted in a shadow root rather than an iframe. An iframe
 * isolates the contract's print stylesheet just as well, but it has to be told
 * how tall it is, and iOS Safari sizes and scales iframes on its own terms —
 * which left the contract drawn narrow, clipped, and with its pages painted
 * over each other. In a shadow root the contract is ordinary layout: it takes
 * exactly the room it needs, and `zoom` shrinks that box for real, so there is
 * no height to measure and nothing to clip.
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
  const host = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [mountedHtml, setMountedHtml] = useState<string | null>(null);
  /** The document's own height, before scaling. */
  const [contentHeight, setContentHeight] = useState(0);

  const { fontFaces, css, body } = splitContract(html);
  useContractFonts(fontFaces);

  const measure = useCallback(() => {
    const width = wrapper.current?.clientWidth;
    // Fill the space given, up or down. Capping this at 1 left the contract
    // stranded at its own 816px beside a wider panel, with dead space to the
    // right of it; scaling up is safe because the document is live text, not
    // a bitmap, so it stays sharp.
    if (width) setFitScale(Math.min(Math.max(width / PAGE_WIDTH, 0.2), 2));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Mount the document into a shadow root, where the contract's own CSS cannot
  // reach the app and the app's cannot reach the contract.
  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${css}${SLOT_UI_CSS}</style><div class="contract-body">${body}</div>`;
    setMountedHtml(html);
  }, [html, css, body]);

  // The document is scaled with a transform, which every browser applies the
  // same way. `zoom` looked tidier — no height to track — but Safari scales
  // only part of the layout with it, which is how pages ended up overlapping
  // on the phone. A transform leaves the unscaled box behind, so the wrapper
  // is given the scaled height, measured from the live document.
  useEffect(() => {
    const element = host.current;
    if (!element) return;

    // offsetHeight is layout height, which a transform does not touch.
    const track = () => setContentHeight(element.offsetHeight);
    track();

    const observer = new ResizeObserver(track);
    observer.observe(element);
    document.fonts?.ready.then(track).catch(() => {});

    return () => observer.disconnect();
  }, [mountedHtml]);

  // Slot decoration and click handling.
  useEffect(() => {
    const root = host.current?.shadowRoot;
    if (!root || mountedHtml !== html) return;

    for (const element of Array.from(root.querySelectorAll<HTMLElement>("[data-slot]"))) {
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
  }, [activeSlots, stamps, onSlotClick, mountedHtml, html]);

  useEffect(() => {
    const root = host.current?.shadowRoot;
    if (!focusSlot || !root) return;

    const element = root.querySelector<HTMLElement>(`[data-slot="${focusSlot.id}"]`);
    if (!element) return;

    element.dataset.focused = "1";
    // Ordinary DOM now, so the browser can do the scrolling maths itself.
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    const timer = setTimeout(() => delete element.dataset.focused, 2000);
    return () => clearTimeout(timer);
  }, [focusSlot]);

  const scale = fitScale * userZoom;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <span className="mr-1 text-xs text-slate-500">Zoom</span>
        <ZoomButton label="Zoom out" disabled={userZoom <= 0.55} onClick={() => setUserZoom((z) => Math.max(z - 0.25, 0.5))}>
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

      <div ref={wrapper} className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <div style={{ height: contentHeight * scale, width: PAGE_WIDTH * scale }}>
          <div
            ref={host}
            style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        </div>
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
