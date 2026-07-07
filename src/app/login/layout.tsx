import TopHeader from "@/components/TopHeader";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopHeader />
      <div className="flex px-4 max-w-screen-md m-auto pb-16">{children}</div>
    </>
  );
}
