import { notFound } from "next/navigation";
import {
  componentRegistry,
  getComponentFolder,
} from "@/lib/componentRegistry";

export default async function ComponentPreviewPage({
  params,
}: {
  params: Promise<{ folder: string; slug: string }>;
}) {
  const { folder, slug } = await params;
  const component = componentRegistry.find((entry) => entry.slug === slug);

  if (!component || getComponentFolder(component) !== folder) {
    notFound();
  }

  return null;
}
