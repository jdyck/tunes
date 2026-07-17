"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { leagueGothic } from "@/lib/fonts";
import { componentRegistry } from "@/lib/componentRegistry";
import BackLink from "@/components/BackLink";

export default function ComponentsListPane() {
  const pathname = usePathname();

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
          {componentRegistry.map((c) => {
            const isActive = pathname === `/dev/components/${c.slug}`;
            return (
              <li key={c.slug}>
                <Link
                  href={`/dev/components/${c.slug}`}
                  className={`relative flex items-center border-b border-border-default h-14 p-6 pl-0 hover:bg-merino-200 hover:border-b-0 hover:rounded-lg active:bg-cream-300 ${
                    isActive ? "bg-merino-200" : ""
                  }`}
                >
                  <span
                    className={`pl-6 uppercase text-xl truncate min-w-0 ${leagueGothic.className}`}
                  >
                    {c.name}
                  </span>
                  {isActive && (
                    <div className="w-2 h-full absolute bg-mojo-500 shrink-0" />
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
