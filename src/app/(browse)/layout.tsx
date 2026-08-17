import BrowseLayoutShell from "@/components/layout/BrowseLayoutShell";
import { SongsListProvider } from "@/components/song/SongsListContext";
import ConvexUserGate from "@/components/layout/ConvexUserGate";
import { auth } from "@clerk/nextjs/server";

export default async function BrowseLayout({
  detail,
}: {
  children: React.ReactNode;
  detail: React.ReactNode;
}) {
  await auth.protect();

  return (
    <ConvexUserGate>
      <SongsListProvider>
        <BrowseLayoutShell detail={detail} />
      </SongsListProvider>
    </ConvexUserGate>
  );
}
