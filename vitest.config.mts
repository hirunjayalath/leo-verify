import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      CERT_HMAC_SECRET: "test-hmac-secret-at-least-32-characters-long",
      CERT_HMAC_SECRET_PREVIOUS: "previous-hmac-secret-at-least-32-chars!!",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
});
