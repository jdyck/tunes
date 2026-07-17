"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-30 flex items-start sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-merino-100 w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:rounded-lg overflow-y-auto overscroll-none pb-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-line-100 sticky top-0 bg-merino-100">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <XMarkIcon className="h-6 w-6 text-ink-600" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
