import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/how-it-works", "/privacy", "/faq", "/claim", "/login", "/signup"],
        disallow: ["/admin", "/api/", "/v/", "/u/", "/continue"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
