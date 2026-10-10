import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peursum 4 Tracker",
    short_name: "Peursum 4",
    description: "Stand, programma, winkans en spelersstatistieken van Peursum 4",
    lang: "nl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0b0c",
    theme_color: "#e1242f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
