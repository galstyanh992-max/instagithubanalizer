// AI Jarwisyan — Vitest Configuration

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // `server-only` is a Next.js build-time boundary. Unit tests run outside
      // the RSC compiler, so map the marker to a no-op shim while preserving
      // the production import in source modules.
      "server-only": resolve(__dirname, "src/test/server-only.ts"),
    },
  },
});
