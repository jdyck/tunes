import AuthLayoutShell from "@/components/AuthLayoutShell";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
