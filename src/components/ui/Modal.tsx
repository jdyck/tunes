"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/20/solid";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--layer-modal)] flex items-start justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface-app w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:rounded-lg overflow-y-auto overscroll-none pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-paper-600 sticky top-0 z-10 bg-surface-app/70 backdrop-blur-md pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4 sm:bg-surface-app sm:backdrop-blur-none">
          <h2 id={titleId} className="font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <XMarkIcon className="h-6 w-6 text-ink-600" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
