"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A small confirmation dialog for the digitizer ("Replace your current design?").
 *
 * It sits over the page in <body>, takes the keyboard while it is open (Tab stays inside it, Escape and a press on the
 * dimmed area close it), puts focus on its first footer button (the safe one) and gives focus back to where it came from.
 * While it is open the page's own keys are off: DigitizerEditor.jsx checks for `.dz-modal-overlay`.
 */
export default function Modal({ title, onClose, footer, children }) {
  const titleId = useId();
  const box = useRef(null);

  useEffect(() => {
    const before = document.activeElement;
    const root = box.current;
    (root?.querySelector(".dz-modal-foot button:not([disabled])") || root?.querySelector("button:not([disabled])"))?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (before instanceof HTMLElement) before.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div className="dz-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={box} className="dz-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="dz-modal-title">{title}</h2>
        <div className="dz-modal-body">{children}</div>
        {footer && <div className="dz-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
