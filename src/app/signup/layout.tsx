import AuthLayoutShell from "@/components/AuthLayoutShell";

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
