import BrowseLayoutShell from "@/components/BrowseLayoutShell";
import { SongsListProvider } from "@/components/SongsListContext";

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
