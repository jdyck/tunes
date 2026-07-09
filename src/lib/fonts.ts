// Import fonts from next/font/google
import { Anton, Antonio, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";

// Jazz Library design tokens: display face
const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-antonio",
});

// Jazz Library design tokens: song headline face (single black weight)
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-anton",
});

// Jazz Library design tokens: body face
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-sans",
});

// Jazz Library design tokens: mono face
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export { anton, antonio, instrumentSans, ibmPlexMono };
