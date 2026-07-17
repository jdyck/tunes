import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import NavLink from "@/components/NavLink";
import { leagueGothic } from "@/lib/fonts";

export default function BrowseSidebar() {
  return (
    <aside className="flex flex-col lg:w-64 lg:shrink-0 lg:h-full bg-merino-100 border-r border-line-100">
      <div className="bg-azure-600 p-4 py-16 flex items-center justify-between">
        <Link
          href="/"
          className={` uppercase text-lg  items-center text-merino-100 ${leagueGothic.className}`}
        >
          <p className={`block text-shadow w-full text-6xl `}>Standards</p>
        </Link>
        <AccountMenu />
      </div>

      <nav className="flex flex-col gap-1 p-6">
        <NavLink href="/songs">Songs</NavLink>
        {process.env.NODE_ENV === "development" && (
          <NavLink href="/dev/components">Components</NavLink>
        )}
      </nav>

      <div className="mt-auto h-24" />
    </aside>
  );
}
