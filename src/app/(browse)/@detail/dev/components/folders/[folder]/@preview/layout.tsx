import ComponentGalleryBackLink from "@/components/layout/ComponentGalleryBackLink";
import TokenInventoryPanel from "@/components/layout/TokenInventoryPanel";

export default function ComponentPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ComponentGalleryBackLink />
      {children}
      <TokenInventoryPanel />
    </>
  );
}
