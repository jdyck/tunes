import type { Metadata } from "next";
import "./globals.css";
import { anton, antonio, instrumentSans, ibmPlexMono } from "@/lib/fonts";
import GlobalPlayer from "@/components/GlobalPlayer";

export const metadata: Metadata = {
  title: "Tunes",
  description: "Manage and enjoy your music tunes.",
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
      className={`${anton.variable} ${antonio.variable} ${instrumentSans.variable} ${ibmPlexMono.variable}`}
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
      <body className={`bg-cream-200 ${instrumentSans.className} font-[300]`}>
        <GlobalPlayer>{children}</GlobalPlayer>
      </body>
    </html>
  );
}
