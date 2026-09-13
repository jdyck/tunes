export default function DeleteButton({
  label,
  confirmMessage,
  onDelete,
  actionLabel,
  className = "mt-4 w-full px-4 py-2 bg-vermillion-600 text-white font-bold rounded-md hover:bg-vermillion-700",
  disabled = false,
}: {
  label: string;
  confirmMessage: string;
  onDelete: () => void;
  actionLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const handleClick = () => {
    if (disabled) return;
    if (!window.confirm(confirmMessage)) return;
    onDelete();
  };

  return (
    <button type="button" disabled={disabled} onClick={handleClick} className={className}>
      {actionLabel ?? `Delete ${label}`}
    </button>
  );
}
