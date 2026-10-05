import { defineConfig } from "vitest/config";

// Live tests hit the real platform: run on request only (`npm run test:live`).
export default defineConfig({
  test: {
    include: ["live/**/*.live.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
