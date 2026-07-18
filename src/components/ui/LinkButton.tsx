const variantClasses = {
  primary: "text-xs text-teal-700 underline disabled:opacity-70",
  muted: "text-xs text-ink-600 underline",
} as const;

export default function LinkButton({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
}) {
  return (
    <button
      type={type}
      className={`${variantClasses[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
