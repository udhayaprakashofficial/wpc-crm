import path from "path";
import type { NextConfig } from "next";

const projectRoot = path.join(__dirname);

const nextConfig: NextConfig = {
  // Pin workspace root so Vercel’s modifyConfig adapter gets a real path
  // (avoids ERR_INVALID_ARG_TYPE from undefined root autodetection).
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
