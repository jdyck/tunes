import type { Metadata } from "next";
import "./globals.css";
import { leagueGothic, robotoCondensed, robotoMono } from "@/lib/fonts";
import GlobalPlayer from "@/components/GlobalPlayer";

export const metadata: Metadata = {
  title: "Standards",
  description: "Manage and enjoy your music.",
  icons: {
    icon: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${leagueGothic.variable} ${robotoCondensed.variable} ${robotoMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#166534" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <title>{String(metadata.title || "Default Title")}</title>
      </head>
      <body className={`bg-cream-100 ${robotoCondensed.className}`}>
        <GlobalPlayer>{children}</GlobalPlayer>
      </body>
    </html>
  );
}
