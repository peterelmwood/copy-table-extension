import { defineConfig } from "vitest/config";

// Browser end-to-end tests: real Firefox, the packaged extension, and the OS
// clipboard. Kept out of `bun run verify` (whose config only matches
// `*.test.ts`) because they need Firefox and geckodriver installed.
export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/e2e/**/*.e2e.ts"],
    hookTimeout: 120_000,
    testTimeout: 60_000
  }
});
