// Import fonts from next/font/google
import { Merriweather_Sans, Merriweather } from "next/font/google";

// Configure Merriweather Sans
const merriweatherSans = Merriweather_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "700", "800"],
  display: "swap",
});

// Configure Merriweather
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export { merriweatherSans, merriweather };
