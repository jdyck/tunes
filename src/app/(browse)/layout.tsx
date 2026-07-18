import BrowseLayoutShell from "@/components/layout/BrowseLayoutShell";
import { SongsListProvider } from "@/components/song/SongsListContext";

export default function BrowseLayout({
  detail,
}: {
  children: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <SongsListProvider>
      <BrowseLayoutShell detail={detail} />
    </SongsListProvider>
  );
}
