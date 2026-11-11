import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live VPS Signal Relays & Push Notifications — StratMarket Docs",
  description:
    "Technical specifications of StratMarket's 24/7 VPS execution infrastructure: sub-50ms signal processing, HMAC SHA-256 webhook contracts, Chrome push notifications, and email relays.",
  keywords: [
    "VPS Signal Relays",
    "TradingView Webhook Automation",
    "Sub-50ms Signal Execution",
    "HMAC SHA-256 Webhook",
    "Chrome Push Notifications Trading",
    "Elvaris Capital VPS",
  ],
  alternates: {
    canonical: "https://stratmarket.elvariscapital.in/docs/live-vps-signal-relays",
  },
};

export default function LiveVpsSignalRelaysDoc() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Live VPS Signal Relays & Real-Time Notification Architecture",
    description:
      "Architecture of the 24/7 dedicated Linux VPS cluster and sub-50ms signal dispatching pipeline engineered by Elvaris Capital.",
    url: "https://stratmarket.elvariscapital.in/docs/live-vps-signal-relays",
    author: {
      "@type": "Organization",
      name: "Elvaris Capital Quantitative Engineering Desk",
      url: "https://elvariscapital.in",
    },
    publisher: {
      "@type": "Organization",
      name: "Elvaris Capital",
      url: "https://elvariscapital.in",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>
          Home
        </Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>
          Docs
        </Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>VPS Relays &amp; Notifications</span>
      </div>

      {/* Title */}
      <div style={{ marginBottom: "28px" }}>
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#a3e635",
            fontWeight: 700,
            display: "inline-block",
            marginBottom: "8px",
          }}
        >
          Infrastructure &amp; Latency
        </span>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          Live VPS Signal Relays &amp; Push Notifications
        </h1>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#9ca3af", maxWidth: "800px", margin: 0 }}>
          StratMarket maintains dedicated 24/7 cloud runners co-located near primary liquidity centers (LD4 London and NY4 New York) to guarantee sub-50ms signal delivery.
        </p>
      </div>

      {/* Content Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.7", color: "#d1d5db" }}>
        
        {/* Architecture 1 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            1. The Sub-50ms Signal Pipeline
          </h2>
          <p style={{ margin: "0 0 14px" }}>
            When an entry or exit condition triggers on a confirmed bar close, the signal traverses our multi-tiered delivery pipeline:
          </p>
          <div style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "10px", padding: "18px", fontFamily: "var(--font-mono, monospace)", fontSize: "13px", color: "#a3e635", lineHeight: 1.6, overflowX: "auto" }}>
            [VPS Runner] → (Confirmed M15 Bar) → [HMAC Ingestion: 8ms]<br />
            &nbsp;&nbsp;↳ [Vela Realtime Canvas: In-Place Mutation (0ms)]<br />
            &nbsp;&nbsp;↳ [Chrome Desktop Notification: 32ms]<br />
            &nbsp;&nbsp;↳ [Resend Email Relay: 650ms]<br />
            &nbsp;&nbsp;↳ [Authenticated Broker Webhook: 24ms]
          </div>
        </section>

        {/* Architecture 2 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            2. Browser Push Notifications (Chrome, Edge &amp; Safari)
          </h2>
          <p style={{ margin: "0 0 12px" }}>
            Traders can toggle native browser push notifications with 1 tap from the chart topbar or their profile settings:
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#a1a1aa" }}>
            <li><strong>Entry Audio &amp; Visual Toast:</strong> Immediate alert with instrument, direction (LONG / SHORT), and exact price level.</li>
            <li><strong>Target Hit Notice (+R):</strong> Highlighting realized gain in green (e.g. \`TP HIT (+1.16R)\`).</li>
            <li><strong>Stop Loss Protective Notice (-1.00R):</strong> Immediate notification when a defensive risk stop is triggered.</li>
          </ul>
        </section>

        {/* Architecture 3 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            3. Webhook Security &amp; Idempotency Keys
          </h2>
          <p style={{ margin: "0 0 12px" }}>
            To prevent replay attacks or order duplication during transient network disconnects, every webhook payload carries:
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#a1a1aa" }}>
            <li><strong>Idempotency UUID (\`x-idempotency-key\`):</strong> Ensuring that even if a network timeout causes a retry, your broker only executes the trade once.</li>
            <li><strong>Cryptographic Signature (\`x-signature-sha256\`):</strong> Generated using your unique account secret key.</li>
            <li><strong>Timestamp Window (\`x-timestamp\`):</strong> Requests older than 30 seconds are rejected automatically to avoid stale fills.</li>
          </ul>
        </section>

        {/* Related Navigation */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", paddingTop: "8px" }}>
          <Link href="/profile" className="pill" style={{ background: "#ffffff", color: "#000000", fontWeight: 700, textDecoration: "none", border: "none" }}>
            Configure Alert Preferences in Profile →
          </Link>
          <Link href="/blog/how-to-automate-tradingview-alerts-webhook-execution" className="pill g" style={{ textDecoration: "none", color: "#ffffff" }}>
            Read: Step-by-Step Webhook Automation Guide
          </Link>
        </div>

      </div>
    </div>
  );
}

