import Link from "next/link";
import AccountMenu from "@/components/layout/AccountMenu";
import NavLink from "@/components/ui/NavLink";
import { leagueGothic } from "@/lib/fonts";

export default function BrowseSidebar() {
  return (
    <aside className="flex flex-col lg:w-68 lg:shrink-0 lg:h-full bg-surface-app border-r border-line-100">
      <div className="bg-azure-600 p-4 py-16 flex items-center justify-between -mt-15 lg:mt-0">
        <Link
          href="/"
          className={` uppercase text-lg  items-center text-merino-100 ${leagueGothic.className}`}
        >
          <p className={`block text-shadow w-full text-6xl `}>Standards</p>
        </Link>
        <AccountMenu />
      </div>

      <nav className="flex flex-col gap-1 p-6">
        <NavLink href="/songs" icon="/songs.svg">
          Songs
        </NavLink>
        <NavLink href="/artists" icon="/artists.svg">
          Artists
        </NavLink>
        {/*<NavLink href="/recordings" icon="/record.svg">*/}
        {/*  Recordings*/}
        {/*</NavLink>*/}
        <NavLink href="/tags" icon="/tags.svg">
          Tags
        </NavLink>
        <NavLink href="/lists" icon="/lists.svg">
          Lists
        </NavLink>
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
