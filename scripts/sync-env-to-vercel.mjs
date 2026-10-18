#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ Error: No .env file found at " + envPath);
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath));

// Overrides for production environment
const overrides = {
  AUTH_DEV_BYPASS: "false",
  INNGEST_DEV: "0",
};

const merged = { ...env, ...overrides };

// Keys to ignore from syncing
const ignoredKeys = new Set([
  "SEED_CLUB_ADMIN_PASSWORD",
  "SEED_DISTRICT_ADMIN_PASSWORD",
  "SEED_RECIPIENT_PASSWORD",
]);

const token = process.env.VERCEL_TOKEN || process.argv[2];
const projectId = process.env.VERCEL_PROJECT_ID || process.argv[3];
const teamId = process.env.VERCEL_ORG_ID || process.argv[4];

console.log("▲ LeoVerify Vercel Environment Sync\n");

if (!token || !projectId) {
  console.log("Usage: node scripts/sync-env-to-vercel.mjs <VERCEL_TOKEN> <VERCEL_PROJECT_ID> [VERCEL_ORG_ID]");
  console.log("Or set VERCEL_TOKEN and VERCEL_PROJECT_ID as environment variables.\n");
  console.log("To get your Vercel Project ID:");
  console.log("  1. Open your project on vercel.com");
  console.log("  2. Go to Settings -> General -> Project ID\n");
  console.log("To get your Vercel Token:");
  console.log("  1. Go to https://vercel.com/account/tokens");
  console.log("  2. Create a token with 'Full Account' or project access\n");
  process.exit(1);
}

async function syncToVercel() {
  const urlParams = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Fetch existing env vars to avoid duplicates or update them
  console.log("📡 Fetching existing Vercel project environment variables...");
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env${urlParams}`,
    { headers }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error(`❌ Failed to list Vercel env vars (${listRes.status}):`, errText);
    process.exit(1);
  }

  const { envs = [] } = await listRes.json();
  const existingMap = new Map();
  for (const item of envs) {
    existingMap.set(item.key, item.id);
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const [key, value] of Object.entries(merged)) {
    if (ignoredKeys.has(key)) continue;
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const payload = {
      key,
      value: trimmed,
      type: "encrypted",
      target: ["production", "preview", "development"],
    };

    if (existingMap.has(key)) {
      const envId = existingMap.get(key);
      const editRes = await fetch(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env/${envId}${urlParams}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ value: trimmed, target: payload.target }),
        }
      );
      if (editRes.ok) {
        console.log(`  ✓ Updated: ${key}`);
        updatedCount++;
      } else {
        console.error(`  ✗ Failed to update ${key}: ${await editRes.text()}`);
      }
    } else {
      const createRes = await fetch(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env${urlParams}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );
      if (createRes.ok) {
        console.log(`  ✓ Added: ${key}`);
        createdCount++;
      } else {
        console.error(`  ✗ Failed to add ${key}: ${await createRes.text()}`);
      }
    }
  }

  console.log(`\n🎉 Vercel Environment Sync Complete:`);
  console.log(`  - Added: ${createdCount}`);
  console.log(`  - Updated: ${updatedCount}`);
}

syncToVercel().catch((err) => {
  console.error("Fatal error syncing to Vercel:", err);
  process.exit(1);
});
