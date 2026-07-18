"use client";

import { WriterInput } from "@/lib/songWriters";
import { SongWriterRole } from "@/types/types";
import { XMarkIcon } from "@heroicons/react/20/solid";

const ROLE_OPTIONS: { value: SongWriterRole; label: string }[] = [
  { value: "composer", label: "Composer" },
  { value: "lyricist", label: "Lyricist" },
  { value: "writer", label: "Writer" },
];

export default function SongWritersEditor({
  value,
  onChange,
  onClose,
}: {
  value: WriterInput[];
  onChange: (next: WriterInput[]) => void;
  onClose?: () => void;
}) {
  const updateRow = (index: number, patch: Partial<WriterInput>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...value, { name: "", role: "composer" }]);
  };

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="block text-sm">Writers</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close writers editor"
            className="rounded-sm p-1 text-ink-600 hover:bg-merino-200 hover:text-ink-900"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      {value.map((row, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
          <input
            className="flex-1 min-w-0 p-2 rounded-md border border-line-200"
            type="text"
            placeholder="Name"
            value={row.name}
            onChange={(e) => updateRow(index, { name: e.target.value })}
          />
          <select
            className="p-2 rounded-md border border-line-200"
            value={row.role}
            onChange={(e) =>
              updateRow(index, { role: e.target.value as SongWriterRole })
            }
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => removeRow(index)}
            aria-label="Remove writer"
            className="shrink-0"
          >
            <XMarkIcon className="h-5 w-5 text-ink-600" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-sm text-teal-700 underline"
      >
        + Add writer
      </button>
    </div>
  );
}
