import Link from "next/link";
import { MusicalNoteIcon } from "@heroicons/react/16/solid";
import AccountMenu from "@/components/AccountMenu";
import TopHeader from "@/components/TopHeader";
import DetailPaneGate from "@/components/DetailPaneGate";
import SongsListPane from "@/components/SongsListPane";
import {leagueGothic, robotoCondensed} from "@/lib/fonts";

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

      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen bg-cream-100 border-r border-line-100">
        <div className="bg-[#376091] p-4 py-16 flex items-center justify-between">
          <Link
            href="/"
            className={` uppercase text-lg  items-center text-cream-100 ${leagueGothic.className}`}
          >
            <p className={`block text-shadow w-full text-6xl `}>Standards</p>
          </Link>
          <AccountMenu />
        </div>
        {/*<div className={`flex gap-2 py-2`}>*/}
        {/*  <div className={`bg-[#3767A5]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#A72F0A]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#81C230]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#719D3B]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-cream-200 w-12 h-12`}></div>*/}
        {/*</div>*/}
        {/*<div className={`flex gap-2`}>*/}
        {/*  <div className={`bg-[#CAC3B4]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#9F998C]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#78736A]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#4F4B46]/90 w-12 h-12`}></div>*/}
        {/*  <div className={`bg-[#252322]/90 w-12 h-12`}></div>*/}
        {/*</div>*/}

        <nav className="px-2">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md font-semibold hover:bg-cream-200"
          >
            Songs
          </Link>
        </nav>

        <div className="mt-auto h-24" />
      </aside>

      <div className="flex-1 flex lg:h-screen lg:overflow-hidden">
        <div className="fixed inset-x-0 top-16 bottom-0 z-10 overflow-y-auto pb-16 lg:static lg:inset-auto lg:z-auto lg:w-96 lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-r-2 lg:border-line-100">
          <SongsListPane />
        </div>
        <div className="lg:flex lg:flex-1 lg:h-full lg:overflow-hidden">
          <DetailPaneGate>{detail}</DetailPaneGate>
        </div>
      </div>
    </div>
  );
}
