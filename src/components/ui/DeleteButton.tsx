export default function DeleteButton({
  label,
  confirmMessage,
  onDelete,
  className = "mt-4 w-full px-4 py-2 bg-mojo-600 text-white font-bold rounded-md hover:bg-mojo-700",
}: {
  label: string;
  confirmMessage: string;
  onDelete: () => void;
  className?: string;
}) {
  const handleClick = () => {
    if (!window.confirm(confirmMessage)) return;
    onDelete();
  };

  return (
    <button onClick={handleClick} className={className}>
      Delete {label}
    </button>
  );
}
