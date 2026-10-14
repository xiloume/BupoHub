import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: "mysql://test:test@localhost:3306/test",
      SESSION_SECRET: "test-secret-test-secret-test-secret-test-secret",
    },
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/__mocks__/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
