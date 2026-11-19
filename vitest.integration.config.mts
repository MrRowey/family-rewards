import { defineConfig } from "vitest/config";
import path from "node:path";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("Integration tests require TEST_DATABASE_URL pointing to a dedicated disposable PostgreSQL test database.");
}
let parsed: URL;
try {
  parsed = new URL(url);
} catch {
  throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
}
const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!["postgresql:", "postgres:"].includes(parsed.protocol) || !database || !/(^|[_-])test($|[_-])|^test[_-]/i.test(database)) {
  throw new Error("TEST_DATABASE_URL must use PostgreSQL and name a dedicated test database (for example family_rewards_test).");
}
if (process.env.DATABASE_URL === url && process.env.CI !== "true") {
  throw new Error("TEST_DATABASE_URL must not match DATABASE_URL. Use a separate disposable test database.");
}
process.env.DATABASE_URL = url;

export default defineConfig({
  test: {
    environment: "node",
    include: ["integration/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
});
