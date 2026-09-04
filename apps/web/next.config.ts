import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Set monorepo root so Turbopack can resolve hoisted packages.
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
