import type { NextConfig } from "next";

// PREVIEW_EXPORT=1 builds a fully static, relative-path bundle (used for the
// shareable Artifact preview). Normal builds and Vercel are unaffected.
const exportPreview = process.env.PREVIEW_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  ...(exportPreview
    ? {
        output: "export" as const,
        assetPrefix: ".",
        images: { unoptimized: true },
        // Static export cannot serve POST route handlers. Only `.tsx` files are
        // treated as routes here, which leaves out app/api/**/route.ts (the
        // optional ICP research); the client sees the flag and skips the call.
        pageExtensions: ["tsx"],
        env: { NEXT_PUBLIC_TERRITORY_STATIC: "1" },
      }
    : {}),
};

export default nextConfig;
