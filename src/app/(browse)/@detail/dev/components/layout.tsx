import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";

export default function DevComponentsDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="bg-cream-100 fixed inset-x-0 top-0 bottom-0 z-20 overflow-y-auto pb-16 lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-r lg:border-line-100 p-8">
      <BackLink href="/dev/components" label="Back to components" />
      {children}
    </div>
  );
}
