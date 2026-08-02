"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { leagueGothic } from "@/lib/fonts";
import {
  componentFolders,
  getComponentFromGalleryPathname,
  getComponentFolder,
} from "@/lib/componentRegistry";
import BackLink from "@/components/ui/BackLink";

export default function ComponentsListPane() {
  const pathname = usePathname();
  const selectedComponent = getComponentFromGalleryPathname(pathname);

  return (
    <div className="w-full h-full flex flex-col">
      <BackLink href="/"></BackLink>
      <div className="flex items-center justify-between p-8">
        <h1 className={`text-7xl uppercase ${leagueGothic.className}`}>
          Components
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-12">
        <ul>
          {componentFolders.map((folder) => {
            const isActive =
              pathname === `/dev/components/folders/${folder}` ||
              (selectedComponent !== undefined &&
                getComponentFolder(selectedComponent) === folder);
            return (
              <li key={folder}>
                <Link
                  href={`/dev/components/folders/${folder}`}
                  className={`relative flex items-center border-b border-border-default h-14 p-6 pl-0 hover:bg-paper-200 hover:border-b-0 hover:rounded-lg active:bg-cream-300 ${
                    isActive ? "bg-paper-200" : ""
                  }`}
                >
                  <span
                    className={`pl-6 uppercase text-xl truncate min-w-0 ${leagueGothic.className}`}
                  >
                    {folder}
                  </span>
                  {isActive && (
                    <div className="w-2 h-full absolute bg-vermillion-500 shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
