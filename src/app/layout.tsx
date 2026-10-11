import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed, Permanent_Marker } from "next/font/google";
import { BASE } from "@/lib/base";
import "./globals.css";

// Logo en grote cijfers
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
// Labels, teamnamen, hoofdletters met letterafstand
const barlowCond = Barlow_Condensed({
  variable: "--font-barlow-cond",
  weight: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});
// Lopende tekst
const barlow = Barlow({ variable: "--font-barlow", weight: ["400", "500", "600"], subsets: ["latin"] });
// Penseelstijl ("vs" en titels)
const marker = Permanent_Marker({ variable: "--font-marker", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peursum 4",
  description: "Stand, programma, winkans en spelersstatistieken van Peursum 4",
  appleWebApp: { capable: true, title: "Peursum 4", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: `${BASE}/icons/icon.svg`, type: "image/svg+xml" },
      { url: `${BASE}/icons/favicon-48.png`, sizes: "48x48", type: "image/png" },
    ],
    apple: `${BASE}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#e1242f",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${anton.variable} ${barlowCond.variable} ${barlow.variable} ${marker.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
