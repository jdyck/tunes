import BrowseSidebar from "@/components/BrowseSidebar";
import DetailPaneGate from "@/components/DetailPaneGate";
import SongsListPane from "@/components/SongsListPane";
import { SongsListProvider } from "@/components/SongsListContext";

export default function BrowseLayout({
  detail,
}: {
  children: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <SongsListProvider>
      <div className="lg:flex lg:h-screen">
        <BrowseSidebar />

        <div className="flex-1 flex lg:h-screen lg:overflow-hidden">
          <div className="fixed inset-x-0 top-16 bottom-0 z-10 overflow-y-auto pb-16 bg-cream-100 lg:static lg:inset-auto lg:z-auto lg:w-96 lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-r-2 lg:border-line-100">
            <SongsListPane />
          </div>
          <div className="lg:flex lg:flex-1 lg:h-full lg:overflow-hidden">
            <DetailPaneGate>{detail}</DetailPaneGate>
          </div>
        </div>
      </div>
    </SongsListProvider>
  );
}
