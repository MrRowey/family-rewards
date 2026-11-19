import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "integration/**/*.test.ts", "integration/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
  },
});
