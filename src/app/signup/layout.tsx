import AuthLayoutShell from "@/components/layout/AuthLayoutShell";

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
