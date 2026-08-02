export default function DeleteButton({
  label,
  confirmMessage,
  onDelete,
  actionLabel,
  className = "mt-4 w-full px-4 py-2 bg-vermillion-600 text-white font-bold rounded-md hover:bg-vermillion-700",
}: {
  label: string;
  confirmMessage: string;
  onDelete: () => void;
  actionLabel?: string;
  className?: string;
}) {
  const handleClick = () => {
    if (!window.confirm(confirmMessage)) return;
    onDelete();
  };

  return (
    <button onClick={handleClick} className={className}>
      {actionLabel ?? `Delete ${label}`}
    </button>
  );
}
