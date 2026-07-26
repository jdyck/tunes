"use client";

import { usePathname } from "next/navigation";
import SongsListPane from "@/components/song/SongsListPane";
import ArtistsListPane from "@/components/artist/ArtistsListPane";
import ComponentsListPane from "@/components/layout/ComponentsListPane";

export default function ListPaneSwitch() {
  const pathname = usePathname();

  if (
    process.env.NODE_ENV === "development" &&
    pathname.startsWith("/dev/components")
  ) {
    return <ComponentsListPane />;
  }
  if (pathname === "/artists" || pathname.startsWith("/artist/")) {
    return <ArtistsListPane />;
  }
  return <SongsListPane />;
}
