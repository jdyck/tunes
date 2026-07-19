export default function NotesField({
  label,
  value,
  onChange,
  rows = 6,
  placeholder,
  className = "w-full p-1.5 rounded-md mb-4",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    </label>
  );
}
