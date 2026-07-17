import type { Metadata, Viewport } from "next";
import "./globals.css";
import { leagueGothic, robotoCondensed, robotoMono } from "@/lib/fonts";
import GlobalPlayerGate from "@/components/GlobalPlayerGate";

export const metadata: Metadata = {
  title: "Standards",
  description: "Manage and enjoy your music.",
  icons: {
    icon: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`bg-black ${leagueGothic.variable} ${robotoCondensed.variable} ${robotoMono.variable}`}
    >
    <head>
      <link rel="manifest" href="/manifest.json" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="theme-color" content="#000000" />

      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <title>{String(metadata.title || "Default Title")}</title>
    </head>
    <body className={`bg-black ${robotoCondensed.className}`}>
    <div className="w-full h-full bg-merino-100">
      <GlobalPlayerGate>{children}</GlobalPlayerGate>
    </div>
    </body>
    </html>
  );
}
