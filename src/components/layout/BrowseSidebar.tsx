import Link from "next/link";
import AccountMenu from "@/components/layout/AccountMenu";
import NavLink from "@/components/ui/NavLink";
import { leagueGothic } from "@/lib/fonts";

export default function BrowseSidebar() {
  return (
    <aside className="flex flex-col lg:w-68 lg:shrink-0 lg:h-full bg-surface-app border-r border-paper-600">
      <div className="bg-azure-600 p-4 py-16 flex items-center justify-between -mt-15 lg:mt-0">
        <Link
          href="/"
          className={` uppercase text-lg  items-center text-paper-100 ${leagueGothic.className}`}
        >
          <p className={`block text-shadow w-full text-6xl `}>Standards</p>
        </Link>
        <AccountMenu />
      </div>

      <nav className="flex flex-col gap-1 p-6">
        <NavLink href="/songs" icon="/songs.svg">
          Songs
        </NavLink>
        {/* The branch evaluation stops at the Song/Artist-credit slice. */}
        {process.env.NODE_ENV === "development" && (
          <NavLink href="/dev/components" icon="/folder.svg">
            Components
          </NavLink>
        )}
      </nav>

      <div className="mt-auto h-24" />
    </aside>
  );
}
