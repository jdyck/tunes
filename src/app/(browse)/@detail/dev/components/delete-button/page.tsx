"use client";

import DeleteButton from "@/components/DeleteButton";

export default function DeleteButtonDemoPage() {
  return (
    <div className="max-w-sm">
      <DeleteButton
        label="Song"
        confirmMessage="Are you sure you want to delete this tune? This action cannot be undone."
        onDelete={() => console.log("[demo] delete confirmed")}
      />
    </div>
  );
}
