#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ Error: No .env file found at " + envPath);
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath));

// Enforce production security invariants for production deployment
const overrides = {
  AUTH_DEV_BYPASS: "false",
  INNGEST_DEV: "0",
};

const merged = { ...env, ...overrides };

// Keys to ignore from syncing (local development seeds or passwords)
const ignoredKeys = new Set([
  "SEED_CLUB_ADMIN_PASSWORD",
  "SEED_DISTRICT_ADMIN_PASSWORD",
  "SEED_RECIPIENT_PASSWORD",
]);

console.log("🔒 Syncing .env secrets to GitHub Repository Secrets using gh CLI...\n");

let successCount = 0;
let skippedCount = 0;
const missingProductionKeys = [];

for (const [key, value] of Object.entries(merged)) {
  if (ignoredKeys.has(key)) {
    continue;
  }

  const trimmed = value?.trim();
  if (!trimmed) {
    skippedCount++;
    if ([
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "INNGEST_EVENT_KEY",
      "INNGEST_SIGNING_KEY",
    ].includes(key)) {
      missingProductionKeys.push(key);
    }
    continue;
  }

  try {
    execFileSync("gh", ["secret", "set", key, "--body", trimmed], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(`  ✓ Synced secret: ${key}`);
    successCount++;
  } catch (err) {
    console.error(`  ✗ Failed to set ${key}:`, err.message);
  }
}

console.log(`\n🎉 Successfully synced ${successCount} secrets to GitHub Repository Secrets.`);
if (skippedCount > 0) {
  console.log(`ℹ️  Skipped ${skippedCount} empty or non-production variables.`);
}

if (missingProductionKeys.length > 0) {
  console.log("\n⚠️  Note on Cloudflare R2 and Inngest Cloud:");
  console.log("   The following production keys are currently empty in your local .env:");
  missingProductionKeys.forEach((k) => console.log(`   - ${k}`));
  console.log("   In production, Cloudflare R2 is required for private certificate PDF storage,");
  console.log("   and Inngest Cloud is required for asynchronous CSV imports.");
  console.log("   If you have not provisioned them yet, add them to GitHub / Vercel secrets when ready.\n");
}
