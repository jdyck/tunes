import { notFound } from "next/navigation";
import BackLink from "@/components/ui/BackLink";
import TokenInventoryPanel from "@/components/layout/TokenInventoryPanel";

export default function DevComponentsDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-[var(--layer-browse-detail)] overflow-y-auto overscroll-none bg-surface-app px-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:h-full lg:overflow-y-auto lg:pt-8 lg:pb-8 lg:border-r lg:border-line-100">
      <BackLink href="/dev/components" label="Back to components" />
      {children}
      <TokenInventoryPanel />
    </div>
  );
}
