import { isIP } from "node:net";
import path from "node:path";

const MAX_BYTES = 8 * 1024 * 1024;

function uploadsRoot(): string {
  return path.resolve(process.cwd(), "public", "uploads");
}

function allowedRemoteHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const raw of [
    process.env.R2_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname.toLowerCase());
    } catch {
      /* ignore bad env */
    }
  }
  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return hosts;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "metadata.google.internal") return true;
  const ipVersion = isIP(host);
  if (!ipVersion) return false;
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (host === "::1") return true;
  if (host.startsWith("fe80:")) return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
}

/** Path containment + host allowlist (SSRF-safe). */
export async function fetchBackgroundBytes(url: string): Promise<Uint8Array> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid background URL");
  }

  if (url.startsWith("/") || url.includes("/uploads/")) {
    const rawName = url.includes("/uploads/")
      ? url.split("/uploads/").pop()!
      : url.replace(/^\//, "");
    const filename = decodeURIComponent(rawName.split("?")[0] ?? "");
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\") ||
      path.isAbsolute(filename)
    ) {
      throw new Error("Invalid local upload path");
    }
    const root = uploadsRoot();
    const filePath = path.resolve(root, filename);
    if (!filePath.startsWith(root + path.sep) && filePath !== root) {
      throw new Error("Path escapes uploads directory");
    }
    const { readFile } = await import("node:fs/promises");
    const buf = await readFile(filePath);
    if (buf.byteLength > MAX_BYTES) throw new Error("Background too large");
    return new Uint8Array(buf);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid background URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Unsupported background URL scheme");
  }

  const host = parsed.hostname.toLowerCase();
  const allow = allowedRemoteHosts();
  // Localhost only when APP URL is also local; always block cloud metadata.
  if (isPrivateOrLocalHost(host) && !allow.has(host)) {
    throw new Error("Background host not allowlisted");
  }
  if (!allow.has(host)) {
    throw new Error("Background host not allowlisted");
  }

  const res = await fetch(parsed.toString(), {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch background: ${res.status}`);
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_BYTES) throw new Error("Background too large");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("Background too large");
  return buf;
}
