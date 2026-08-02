import { notFound } from "next/navigation";
import BackLink from "@/components/ui/BackLink";
import ComponentFolderContent from "@/components/layout/ComponentFolderContent";
import ComponentPreviewPaneGate from "@/components/layout/ComponentPreviewPaneGate";
import { componentFolders } from "@/lib/componentRegistry";

export default async function ComponentFolderLayout({
  children,
  preview,
  params,
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
  params: Promise<{ folder: string }>;
}) {
  const { folder } = await params;

  if (!componentFolders.includes(folder)) {
    notFound();
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 bottom-0 z-[var(--layer-browse-detail)] overflow-y-auto overscroll-none bg-surface-app px-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:w-sm lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pt-8 lg:pb-8 lg:border-r lg:border-paper-600 xl:w-md">
        <BackLink href="/dev/components" label="Back to components" />
        <ComponentFolderContent folder={folder} />
        {children}
      </div>
      <ComponentPreviewPaneGate
        backHref={`/dev/components/folders/${folder}`}
      >
        {preview}
      </ComponentPreviewPaneGate>
    </>
  );
}
