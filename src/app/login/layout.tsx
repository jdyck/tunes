import AuthLayoutShell from "@/components/layout/AuthLayoutShell";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
