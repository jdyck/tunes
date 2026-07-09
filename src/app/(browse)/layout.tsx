import Link from "next/link";
import { MusicalNoteIcon } from "@heroicons/react/16/solid";
import AccountMenu from "@/components/AccountMenu";
import TopHeader from "@/components/TopHeader";
import DetailPaneGate from "@/components/DetailPaneGate";
import SongsListPane from "@/components/SongsListPane";

// The song list never varies by URL, so it's rendered directly here rather
// than through the `children` slot — routing it through `page.tsx`/
// `default.tsx` caused it to remount (and refetch) on every navigation into
// a song, since Next treats those as different component identities.
export default function BrowseLayout({
  detail,
}: {
  children: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="lg:flex lg:h-screen">
      <div className="lg:hidden">
        <TopHeader />
      </div>

      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen bg-white border-r border-slate-200">
        <div className="p-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-extrabold uppercase text-lg flex items-center text-green-800"
          >
            <MusicalNoteIcon className="w-5 h-5 inline-block mr-1" />
            Tunes
          </Link>
          <AccountMenu />
        </div>
        <nav className="px-2">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md font-semibold text-green-900 hover:bg-slate-100"
          >
            Songs
          </Link>
        </nav>
        {/* Reserved space for the fixed player bar, which docks to this
            pane's width/position on desktop — see GlobalPlayer.tsx. */}
        <div className="mt-auto h-24" />
      </aside>

      <div className="flex-1 flex lg:h-screen lg:overflow-hidden">
        <div className="fixed inset-x-0 top-16 bottom-0 z-10 overflow-y-auto pb-16 bg-slate-100 lg:static lg:inset-auto lg:z-auto lg:w-96 lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-r lg:border-slate-200">
          <SongsListPane />
        </div>
        <div className="lg:flex lg:flex-1 lg:h-full lg:overflow-hidden">
          <DetailPaneGate>{detail}</DetailPaneGate>
        </div>
      </div>
    </div>
  );
}
