"use client";

import { WriterInput } from "@/utils/songWriters";
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
}: {
  value: WriterInput[];
  onChange: (next: WriterInput[]) => void;
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
      <span className="block text-sm mb-1">Writers</span>
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
