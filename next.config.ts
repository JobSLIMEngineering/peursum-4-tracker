import type { NextConfig } from "next";

// De app draait als statische site op GitHub Pages, onder /peursum-4-tracker.
// Lokaal (npm run dev) is het basispad leeg.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
