import { League_Gothic, Roboto_Condensed, Roboto_Mono } from "next/font/google";

const leagueGothic = League_Gothic({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-league-gothic"
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-roboto-condensed",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export { leagueGothic, robotoCondensed, robotoMono };
