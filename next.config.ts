import type { NextConfig } from "next";

// PREVIEW_EXPORT=1 builds a fully static, relative-path bundle (used for the
// shareable Artifact preview). Normal builds and Vercel are unaffected.
const exportPreview = process.env.PREVIEW_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  ...(exportPreview ? { output: "export" as const, assetPrefix: ".", images: { unoptimized: true } } : {}),
};

export default nextConfig;
