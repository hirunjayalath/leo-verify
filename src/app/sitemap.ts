import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const now = new Date();
  const paths = ["", "/about", "/how-it-works", "/privacy", "/faq", "/claim", "/login"];
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/about" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
