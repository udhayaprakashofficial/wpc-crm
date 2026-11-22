import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cookie-auth CRM routes need full request-time RSC payloads.
  // partialPrefetching + cacheComponents were serving empty /app/*.rsc
  // shells (0 bytes), so client navigations showed "This page couldn’t load".
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
