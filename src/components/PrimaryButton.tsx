export default function PrimaryButton({
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`bg-slate-700 text-white rounded-lg ${className}`}
      {...props}
    />
  );
}
