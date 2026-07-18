const typeClasses = {
  error: "text-mojo-600",
  success: "text-green-700",
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
