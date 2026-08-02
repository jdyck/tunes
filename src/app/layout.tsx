import type { Metadata, Viewport } from "next";
import "./globals.css";
import { leagueGothic, robotoCondensed, robotoMono } from "@/lib/fonts";
import GlobalPlayerGate from "@/components/player/GlobalPlayerGate";

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
      className={`bg-surface-app overscroll-none ${leagueGothic.variable} ${robotoCondensed.variable} ${robotoMono.variable}`}
    >
    <head>
      <link rel="manifest" href="/manifest.json" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      {/* Must be a literal -- meta tags can't read CSS custom properties. Keep
          it equal to --color-surface-app (paper-50) so the browser chrome
          matches the page; it drifted once already when paper was re-picked. */}
      <meta name="theme-color" content="#FAF8F5" />

      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <title>{String(metadata.title || "Default Title")}</title>
    </head>
    <body className={`bg-surface-app overscroll-none ${robotoCondensed.className}`}>
    <div className="w-full h-full pt-[env(safe-area-inset-top)] bg-surface-app">
      <GlobalPlayerGate>{children}</GlobalPlayerGate>
    </div>
    <div className="paper-grain" aria-hidden="true" />
    </body>
    </html>
  );
}
