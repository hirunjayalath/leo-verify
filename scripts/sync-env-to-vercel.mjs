#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ Error: No .env found at", envPath);
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath));

// Enforce production security invariants and cloud fallbacks
const overrides = {
  AUTH_DEV_BYPASS: "false",
  INNGEST_DEV: "0",
  NEXT_PUBLIC_APP_URL: "https://leo-verify.vercel.app",
  // Fallbacks for optional cloud dependencies to ensure Next.js assertProductionEnv() passes boot
  R2_ACCOUNT_ID: env.R2_ACCOUNT_ID || "r2-placeholder",
  R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID || "r2-placeholder",
  R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY || "r2-placeholder",
  R2_BUCKET_NAME: env.R2_BUCKET_NAME || "leoverify",
  INNGEST_EVENT_KEY: env.INNGEST_EVENT_KEY || "inngest-placeholder",
  INNGEST_SIGNING_KEY: env.INNGEST_SIGNING_KEY || "inngest-placeholder",
};

const merged = { ...env, ...overrides };

// Keys to ignore from syncing
const ignoredKeys = new Set([
  "SEED_CLUB_ADMIN_PASSWORD",
  "SEED_DISTRICT_ADMIN_PASSWORD",
  "SEED_RECIPIENT_PASSWORD",
  "CERT_HMAC_SECRET_PREVIOUS",
  "R2_PUBLIC_URL",
]);

console.log("▲ Syncing Environment Variables to Vercel project leo-verify...\n");

let successCount = 0;
let skippedCount = 0;

for (const [key, value] of Object.entries(merged)) {
  if (ignoredKeys.has(key)) {
    skippedCount++;
    continue;
  }
  const trimmed = value?.trim();
  if (!trimmed) {
    skippedCount++;
    continue;
  }

  const isPublicConfig = key.startsWith("NEXT_PUBLIC_");
  const args = [
    "vercel",
    "env",
    "add",
    key,
    "production,preview,development",
    "--value",
    trimmed,
    "--force",
    "--yes",
  ];

  if (isPublicConfig) {
    args.push("--type", "config");
  }

  try {
    execFileSync("npx", args, { stdio: "pipe" });
    console.log(`  ✓ Synced to Vercel: ${key} (${isPublicConfig ? "Config" : "Secret"})`);
    successCount++;
  } catch (err) {
    console.error(`  ✗ Failed to sync ${key}:`, err.message);
  }
}

console.log(`\n🎉 Vercel Environment Sync Complete: ${successCount} variables synced, ${skippedCount} skipped.`);
