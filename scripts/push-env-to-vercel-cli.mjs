#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("No .env found at", envPath);
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath));

// Production defaults and overrides
const overrides = {
  AUTH_DEV_BYPASS: "false",
  INNGEST_DEV: "0",
  NEXT_PUBLIC_APP_URL: "https://leo-verify.vercel.app",
  // Fallbacks for empty production keys so Next.js assertProductionEnv() passes boot
  R2_ACCOUNT_ID: env.R2_ACCOUNT_ID || "r2-placeholder",
  R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID || "r2-placeholder",
  R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY || "r2-placeholder",
  R2_BUCKET_NAME: env.R2_BUCKET_NAME || "leoverify",
  INNGEST_EVENT_KEY: env.INNGEST_EVENT_KEY || "inngest-placeholder",
  INNGEST_SIGNING_KEY: env.INNGEST_SIGNING_KEY || "inngest-placeholder",
};

const merged = { ...env, ...overrides };

// Keys to ignore
const ignoredKeys = new Set([
  "SEED_CLUB_ADMIN_PASSWORD",
  "SEED_DISTRICT_ADMIN_PASSWORD",
  "SEED_RECIPIENT_PASSWORD",
  "CERT_HMAC_SECRET_PREVIOUS",
  "R2_PUBLIC_URL",
]);

console.log("▲ Adding Environment Variables to Vercel project leo-verify...\n");

for (const [key, value] of Object.entries(merged)) {
  if (ignoredKeys.has(key)) continue;
  const trimmed = value?.trim();
  if (!trimmed) continue;

  try {
    execFileSync(
      "npx",
      [
        "vercel",
        "env",
        "add",
        key,
        "production,preview,development",
        "--value",
        trimmed,
        "--force",
        "--yes",
      ],
      { stdio: "pipe" }
    );
    console.log(`  ✓ Added to Vercel: ${key}`);
  } catch (err) {
    console.error(`  ✗ Failed to add ${key}:`, err.message);
  }
}

console.log("\n🎉 All environment variables pushed to Vercel!");
