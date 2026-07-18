"use client";

import { usePathname } from "next/navigation";
import SongsListPane from "@/components/SongsListPane";
import ComponentsListPane from "@/components/ComponentsListPane";

export default function MiddlePaneGate() {
  const pathname = usePathname();

  if (
    process.env.NODE_ENV === "development" &&
    pathname.startsWith("/dev/components")
  ) {
    return <ComponentsListPane />;
  }
  return <SongsListPane />;
}
