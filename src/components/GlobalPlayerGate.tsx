"use client";

import { usePathname } from "next/navigation";
import GlobalPlayer from "@/components/GlobalPlayer";

const routesWithoutPlayer = new Set(["/login", "/signup", "/account"]);

export default function GlobalPlayerGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (routesWithoutPlayer.has(pathname)) {
    return <>{children}</>;
  }

  return <GlobalPlayer>{children}</GlobalPlayer>;
}
