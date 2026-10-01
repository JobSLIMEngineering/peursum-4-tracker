import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, Permanent_Marker } from "next/font/google";
import "./globals.css";

// Teamnamen, datums en koppen
const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

// Penseelstijl voor titels en uitslagen
const marker = Permanent_Marker({
  variable: "--font-marker",
  weight: "400",
  subsets: ["latin"],
});

// Leesbare tekst in lijsten en tabellen
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Peursum 4 Tracker",
  description: "Competitie en spelersstatistieken van Peursum 4",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${bebas.variable} ${marker.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
