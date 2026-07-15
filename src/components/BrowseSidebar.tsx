import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import { leagueGothic } from "@/lib/fonts";

export default function BrowseSidebar() {
  return (
    <aside className="flex flex-col lg:w-64 lg:shrink-0 lg:h-screen bg-merino-100 border-r border-line-100">
      <div className="bg-azure-600 p-4 lg:py-16 flex items-center justify-between">
        <Link
          href="/"
          className={` uppercase text-lg  items-center text-merino-100 ${leagueGothic.className}`}
        >
          <p className={`block text-shadow w-full text-6xl `}>Standards</p>
        </Link>
        <AccountMenu />
      </div>

      <nav className="px-2">
        <Link
          href="/songs"
          className="block px-3 py-2 rounded-md font-semibold hover:bg-merino-200"
        >
          Songs
        </Link>
        {process.env.NODE_ENV === "development" && (
          <Link
            href="/dev/components"
            className="block px-3 py-2 rounded-md font-semibold hover:bg-merino-200"
          >
            Components
          </Link>
        )}
      </nav>

      <div className="mt-auto h-24" />
    </aside>
  );
}
