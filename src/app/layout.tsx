import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { MusicalNoteIcon } from "@heroicons/react/16/solid";
import { merriweatherSans } from "@/lib/fonts";

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
    <html lang="en">
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
      <body className={`bg-slate-100 ${merriweatherSans.className} font-[300]`}>
        <header>
          <Link
            href="/"
            className="p-4 font-[800] uppercase block text-xl flex w-full justify-center text-green-800"
          >
            <MusicalNoteIcon
              className={`w-6 h-6 inline-block mr-0.5 relative top-0.5`}
            />
            Tunes
          </Link>
        </header>
        <div className="flex px-4 max-w-screen-md m-auto pb-16">{children}</div>
      </body>
    </html>
  );
}
