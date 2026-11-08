import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Broker Integration & Webhook APIs — Elvaris Capital",
  description:
    "Connect MetaTrader 5 (MT5), Interactive Brokers, Alpaca, Binance, Dhan, and Zerodha to StratMarket by Elvaris Capital (elvariscapital.in). Webhook API reference.",
};

export default function BrokerIntegrationPage() {
  return (
    <article>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>Documentation</Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>Broker Integration</span>
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
        API &amp; Automated Execution · Elvaris Capital
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        Broker Integration &amp; Webhook API Reference
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        StratMarket by <strong>Elvaris Capital</strong> (
        <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#e2b342", textDecoration: "underline" }}>
          elvariscapital.in
        </a>
        ) allows traders to receive automated real-time trade signals and route them directly to retail, prop firm, and institutional brokerage accounts.
      </p>

      {/* Supported Brokers Grid */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", color: "#fff", margin: "0 0 16px" }}>
          Supported Execution Destinations
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px" }}>
            <h3 style={{ fontSize: "15px", color: "#fff", margin: "0 0 6px" }}>MetaTrader 5 (MT5)</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: "1.5" }}>
              Native integration with MT5 via our lightweight Python bridge or PineConnector EA. Compatible with FTMO, FundedNext, and retail brokers.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px" }}>
            <h3 style={{ fontSize: "15px", color: "#fff", margin: "0 0 6px" }}>Interactive Brokers (IBKR)</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: "1.5" }}>
              Direct connectivity to IBKR Trader Workstation (TWS) and IB Gateway for institutional futures, commodities, and index equities.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px" }}>
            <h3 style={{ fontSize: "15px", color: "#fff", margin: "0 0 6px" }}>Alpaca Securities</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: "1.5" }}>
              Commission-free REST and WebSocket execution API for US equities and crypto trading pairs.
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px" }}>
            <h3 style={{ fontSize: "15px", color: "#fff", margin: "0 0 6px" }}>Indian Brokers (Dhan &amp; Zerodha)</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: "1.5" }}>
              Automated webhook execution for Indian market participants via Dhan HQ API and Zerodha Kite Connect.
            </p>
          </div>
        </div>
      </section>

      {/* Webhook Dispatch Specs */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", color: "#fff", margin: "0 0 16px" }}>
          Webhook Payload Contract
        </h2>
        <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "20px", overflowX: "auto" }}>
          <pre style={{ margin: 0, fontSize: "13px", color: "#e5e7eb", fontFamily: "var(--font-mono, monospace)" }}>
{`// Example: Outbound Signal Payload from StratMarket
{
  "event": "SIGNAL_TRIGGER",
  "strategy": {
    "id": "PS-01",
    "name": "Grandmaster",
    "provider": "Elvaris Capital"
  },
  "trade": {
    "instrument": "XAUUSD",
    "action": "BUY",
    "orderType": "MARKET",
    "entryPrice": 2642.50,
    "stopLoss": 2628.00,
    "takeProfit": 2671.00,
    "riskRewardRatio": 1.96,
    "recommendedRiskPct": 1.0
  },
  "metadata": {
    "timestamp": "2026-11-08T14:30:00.000Z",
    "provenance": "ELVARIS_VPS_RESEARCH_ENGINE",
    "sourceEventId": "sig_ps01_17940428"
  }
}`}
          </pre>
        </div>
      </section>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs/risk-management" className="pill g sm">
          ← Sovereign Risk Governance
        </Link>
        <Link href="/docs/faq" className="pill sm">
          Next: Quantitative FAQ →
        </Link>
      </div>
    </article>
  );
}

