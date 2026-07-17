"use client";

import { usePathname } from "next/navigation";
import BrowseSidebar from "@/components/BrowseSidebar";
import DetailPaneGate from "@/components/DetailPaneGate";
import MiddlePaneGate from "@/components/MiddlePaneGate";

export default function BrowseLayoutShell({
  detail,
}: {
  detail: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  const isSongsList = pathname === "/songs";

  return (
    <div className="lg:flex lg:h-screen">
      <div className={isRoot ? "block" : "hidden lg:block"}>
        <BrowseSidebar />
      </div>

      <div className="flex-1 flex lg:h-screen lg:overflow-hidden">
        <div
          className={`${
            isSongsList ? "fixed" : "hidden"
          } inset-x-0 top-0 bottom-0 z-10 overflow-y-auto overscroll-none pt-[env(safe-area-inset-top)] pb-[calc(4rem+env(safe-area-inset-bottom))] bg-merino-100 lg:block lg:static lg:inset-auto lg:z-auto lg:w-96 lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pt-0 lg:pb-0 lg:border-r-2 lg:border-line-100`}
        >
          <MiddlePaneGate />
        </div>
        <div className="lg:relative lg:flex lg:flex-1 lg:min-w-0 lg:h-full lg:overflow-hidden">
          <DetailPaneGate>{detail}</DetailPaneGate>
        </div>
      </div>
    </div>
  );
}
