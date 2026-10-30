"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  Sentry.captureException(error);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f3f6fb", color: "#0c2340", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ width: "min(100%, 480px)", border: "1px solid #d9e2ef", borderRadius: 24, background: "white", padding: 40, textAlign: "center", boxShadow: "0 24px 60px -36px rgba(12,35,64,.45)" }}>
            <p style={{ margin: 0, color: "#1e40af", fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>LeoVerify</p>
            <h1 style={{ margin: "12px 0 0", fontSize: 30, letterSpacing: "-.03em" }}>Something went wrong</h1>
            <p style={{ margin: "12px 0 24px", color: "#64748b", lineHeight: 1.6 }}>The page could not be loaded. Try the request again.</p>
            <button type="button" onClick={() => reset()} style={{ border: 0, borderRadius: 12, background: "#ffc72c", color: "#0c2340", padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
