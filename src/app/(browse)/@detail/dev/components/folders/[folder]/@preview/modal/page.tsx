"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function ModalDemoPage() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PrimaryButton onClick={() => setOpen(true)} className="px-3 py-2">
        Open modal
      </PrimaryButton>

      {open && (
        <Modal title="Example Modal" onClose={() => setOpen(false)}>
          <p className="text-sm text-ink-600">
            Modal content goes here. Press Escape or click outside to close.
          </p>
        </Modal>
      )}
    </div>
  );
}
