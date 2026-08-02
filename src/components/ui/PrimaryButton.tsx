export default function PrimaryButton({
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`bg-action hover:bg-action-hover text-text-on-accent rounded-lg ${className}`}
      {...props}
    />
  );
}
