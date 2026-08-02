"use client";

import { useId, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { normalizeTags, tagKey } from "@/utils/songTags";

export default function TagChipInput({
  label,
  value,
  suggestions,
  onChange,
}: {
  label: string;
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestionsId = useId();
  const availableSuggestions = useMemo(() => {
    const selected = new Set(value.map(tagKey));
    const query = tagKey(draft);
    return suggestions.filter(
      (tag) =>
        !selected.has(tagKey(tag)) &&
        Boolean(query) &&
        tagKey(tag).startsWith(query)
    );
  }, [draft, suggestions, value]);
  const suggestionsOpen = availableSuggestions.length > 0;

  const commit = (text = draft) => {
    const next = normalizeTags([...value, text], suggestions);
    if (next.length !== value.length) onChange(next);
    setDraft("");
    setActiveSuggestion(0);
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-ink-600" htmlFor="song-tags">
        {label}
      </label>
      <div className="relative mt-1 rounded-md border border-paper-600 bg-surface-app p-2">
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tagKey(tag)}
              className="inline-flex items-center gap-1 rounded-full bg-paper-200 px-2.5 py-1 text-sm text-ink-900"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => tagKey(item) !== tagKey(tag)))}
                aria-label={`Remove ${tag} tag`}
                className="rounded-full p-0.5 hover:bg-paper-200"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            id="song-tags"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setActiveSuggestion(0);
            }}
            onBlur={() => commit()}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestionsOpen) {
                event.preventDefault();
                setActiveSuggestion((index) =>
                  Math.min(index + 1, availableSuggestions.length - 1)
                );
              } else if (event.key === "ArrowUp" && suggestionsOpen) {
                event.preventDefault();
                setActiveSuggestion((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commit(
                  event.key === "Enter" && suggestionsOpen
                    ? availableSuggestions[activeSuggestion]
                    : draft
                );
              } else if (event.key === "Escape" && suggestionsOpen) {
                event.preventDefault();
                setDraft("");
                setActiveSuggestion(0);
              } else if (event.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder={value.length ? "Add tag" : "Add tags"}
            className="min-w-28 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls={suggestionsId}
            aria-activedescendant={
              suggestionsOpen
                ? `${suggestionsId}-option-${activeSuggestion}`
                : undefined
            }
          />
        </div>
        {suggestionsOpen && (
          <div
            id={suggestionsId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-paper-600 bg-surface-app py-1 shadow-md"
          >
            {availableSuggestions.map((tag, index) => (
              <button
                key={tagKey(tag)}
                id={`${suggestionsId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeSuggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(tag)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-paper-100 ${
                  index === activeSuggestion ? "bg-paper-100" : ""
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
