export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex px-4 max-w-3xl m-auto pb-16">{children}</div>
    </>
  );
}
