import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real-Time Signal Architecture & VPS Infrastructure — Elvaris Capital",
  description:
    "Explore the 24/7 VPS execution cluster, webhook dispatch protocols, HMAC authentication, and sub-50ms latency architecture operated by Elvaris Capital (elvariscapital.in).",
};

export default function SignalsAndExecutionPage() {
  return (
    <article>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>Documentation</Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>Signals &amp; Execution</span>
      </div>

      <span
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#e2b342",
          fontWeight: 700,
          display: "inline-block",
          marginBottom: "8px",
        }}
      >
        Execution Engineering · Elvaris Capital
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        Real-Time Signal Architecture &amp; VPS Infrastructure
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        Signal delivery on StratMarket is engineered for ultra-low latency and institutional determinism. Operated by <strong>Elvaris Capital</strong> (
        <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#e2b342", textDecoration: "underline" }}>
          elvariscapital.in
        </a>
        ), our dedicated 24/7 Linux VPS clusters process market data and dispatch actionable trade orders in sub-50 milliseconds.
      </p>

      {/* Infrastructure Specs */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", color: "#fff", margin: "0 0 16px" }}>
          24/7 Dedicated Quant VPS Clusters
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#fff", margin: "0 0 8px" }}>Frankfurt &amp; London Hubs</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Physical proximity to Tier-1 prime liquidity pools, MetaTrader 5 trading servers, and major crypto exchange order matching engines guarantees sub-5ms network ping.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#fff", margin: "0 0 8px" }}>Zero Discretionary Human Delay</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Signals are evaluated purely by algorithmic engines. When mathematical criteria are fulfilled on bar close or instantaneous tick, the signal is triggered automatically.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#fff", margin: "0 0 8px" }}>Idempotent Atomic Processing</h3>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Every inbound trade event requires a deterministic <code>sourceEventId</code>. The database rejects any duplicate event within a 24-hour window, preventing costly double executions.
            </p>
          </div>
        </div>
      </section>

      {/* Webhook JSON Schema */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", color: "#fff", margin: "0 0 16px" }}>
          Signal Ingestion &amp; Webhook Contract
        </h2>
        <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: "0 0 16px" }}>
          StratMarket listens on <code>POST /api/internal/signals</code> for real-time dispatch from TradingView alert webhooks or custom Python VPS execution engines.
        </p>

        <div style={{ background: "rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "20px", overflowX: "auto" }}>
          <pre style={{ margin: 0, fontSize: "13px", color: "#e5e7eb", fontFamily: "var(--font-mono, monospace)" }}>
{`POST /api/internal/signals HTTP/1.1
Host: stratmarket.elvariscapital.in
Content-Type: application/json
Authorization: Bearer <SECURE_SIGNAL_DISPATCH_SECRET>

{
  "strategyId": "PS-01",
  "strategyVersion": "1.2.0",
  "instrument": "XAUUSD",
  "timeframe": "M15",
  "signalType": "ENTRY",
  "direction": "LONG",
  "entryPrice": 2642.50,
  "stopLoss": 2628.00,
  "targetPrice": 2671.00,
  "signalProvenance": "ELVARIS_VPS_RESEARCH_ENGINE",
  "sourceEventId": "evt_ps01_20261108_143000_long"
}`}
          </pre>
        </div>
      </section>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs/algorithmic-strategies" className="pill g sm">
          ← Strategy Catalog
        </Link>
        <Link href="/docs/risk-management" className="pill sm">
          Next: Sovereign Risk Governance →
        </Link>
      </div>
    </article>
  );
}
