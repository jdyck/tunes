type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
};

export default function Switch({
  checked,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
}: SwitchProps) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="h-6 w-11 rounded-full bg-ink-400 shadow-inner transition-colors duration-med ease-standard peer-checked:bg-status-success peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper-100 shadow-sm transition-transform duration-med ease-standard peer-checked:translate-x-5 peer-disabled:opacity-70"
      />
    </span>
  );
}
