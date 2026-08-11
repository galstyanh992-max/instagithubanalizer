import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output is for self-hosted deploys (Docker etc.) where
  // scripts/prepare-standalone.mjs packages .next/standalone into a runnable
  // image. Vercel's own builder (`vercel build`, VERCEL=1 at build time)
  // produces its own serverless/edge output and does not support "standalone"
  // cleanly -- forcing it breaks Next's file-tracing (missing
  // .next/next-server.js.nft.json) during "Finalizing page optimization".
  // Leaving output unset on Vercel lets its builder use its native format.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: false,
  // Runtime state, isolated Python environments and recovery snapshots are
  // never server dependencies. Excluding them prevents standalone tracing
  // from copying gigabytes of third-party/generated files into every route.
  outputFileTracingExcludes: {
    "*": [
      ".jarvis/**",
      "artifacts/**",
      "temp_extract/**",
      "public/dashboard-recovery-baseline/**",
    ],
  },
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
