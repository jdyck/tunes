export default function AsyncStateMessage({
  variant = "default",
  children,
}: {
  variant?: "default" | "error";
  children: React.ReactNode;
}) {
  return (
    <p className={variant === "error" ? "p-4 text-red-600" : "p-4"}>
      {children}
    </p>
  );
}
