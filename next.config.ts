import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
