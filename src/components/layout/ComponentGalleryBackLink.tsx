"use client";

import { usePathname } from "next/navigation";
import BackLink from "@/components/ui/BackLink";
import {
  getComponentFromGalleryPathname,
  getComponentFolder,
} from "@/lib/componentRegistry";

export default function ComponentGalleryBackLink() {
  const pathname = usePathname();
  const component = getComponentFromGalleryPathname(pathname);

  if (!component) {
    return <BackLink href="/dev/components" label="Back to components" />;
  }

  const folder = getComponentFolder(component);
  return (
    <BackLink
      href={`/dev/components/folders/${folder}`}
      label={`Back to ${folder}`}
    />
  );
}
