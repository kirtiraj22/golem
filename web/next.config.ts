import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    resolveAlias: {
      fs: { browser: "./src/empty-module.ts" },
      path: { browser: "./src/empty-module.ts" },
      os: { browser: "./src/empty-module.ts" },
    },
  },};

export default nextConfig;
