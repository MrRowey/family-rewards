import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
});
