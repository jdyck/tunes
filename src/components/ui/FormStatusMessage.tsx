const typeClasses = {
  error: "text-vermillion-600",
  success: "text-azure-600",
} as const;

export default function FormStatusMessage({
  type = "error",
  className = "",
  children,
}: {
  type?: keyof typeof typeClasses;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={`text-sm ${typeClasses[type]} ${className}`.trim()}>
      {children}
    </p>
  );
}
