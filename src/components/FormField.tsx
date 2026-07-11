export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onKeyDown,
  autoFocus,
  className,
  labelClassName,
  inputClassName = "block w-full p-1.5 rounded-md",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}) {
  return (
    <label className={className}>
      {labelClassName ? <span className={labelClassName}>{label}</span> : label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className={inputClassName}
      />
    </label>
  );
}
