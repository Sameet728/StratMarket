import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sovereign Risk Governance & Drawdown Controls — Elvaris Capital",
  description:
    "Explore the institutional risk management framework engineered by Elvaris Capital (elvariscapital.in). Dynamic ATR stops, daily drawdown circuit breakers, and Friday weekend embargoes.",
};

export default function RiskManagementPage() {
  return (
    <article>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>Documentation</Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>Risk Management</span>
      </div>

      <span
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#ffffff",
          fontWeight: 700,
          display: "inline-block",
          marginBottom: "8px",
        }}
      >
        Capital Preservation · Elvaris Capital
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        Sovereign Risk Governance &amp; Drawdown Controls
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        In systematic trading, offensive alpha is useless without uncompromising defensive risk management. The <strong>Elvaris Capital</strong> (
        <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "underline" }}>
          elvariscapital.in
        </a>
        ) Sovereign Risk Governance framework ensures our strategies protect trader capital across all market regimes.
      </p>

      {/* The 5 Tenets */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", color: "#fff", margin: "0 0 20px" }}>
          The Five Foundational Risk Tenets
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 6px" }}>1. Maximum Single-Trade Risk Ceiling (0.5% – 1.5%)</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              No single trade is ever permitted to risk more than 1.5% of total account equity. If consecutive losses occur, lot sizes scale down automatically based on shrinking equity, preventing geometric balance decay.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 6px" }}>2. Daily Portfolio Drawdown Circuit Breaker (3.0%)</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              If cumulative realized and unrealized intraday loss hits 3.0%, the execution engine immediately closes pending orders and suspends new entries until the next UTC 00:00 rollover. This neutralizes market shock anomalies.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 6px" }}>3. Volatility-Adaptive Stops (ATR Sizing)</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Fixed pip stop losses fail because market volatility expands and contracts. All Elvaris Capital strategies calculate bracket stops as a multiple of the 14-period Average True Range (ATR), ensuring stop distances expand during high-volatility expansions and tighten during quiet regimes.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 6px" }}>4. Friday 20:00 UTC Weekend Gap Embargo</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Over 60% of catastrophic tail losses in forex and commodities occur due to weekend geopolitical news gaps between Friday market close and Sunday open. Our intraday models (including PY-06 Trend Shield) mandate liquidating all open swing positions prior to Friday 20:00 UTC.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 6px" }}>5. Absolute Prohibition of Martingale and Grid Sizing</h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Martingale (doubling down on losses) and unstructured grid systems eventually experience a 100% total account blowup. Elvaris Capital strictly forbids non-linear negative progression; every trade carries a predefined, immutable hard stop loss.
            </p>
          </div>
        </div>
      </section>

      {/* Position Sizing Formula */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", color: "#fff", margin: "0 0 16px" }}>
          Mathematical Position Sizing Formula
        </h2>
        <div style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "20px" }}>
          <code style={{ fontSize: "15px", color: "#ffffff", display: "block", marginBottom: "12px", fontFamily: "var(--font-mono, monospace)" }}>
            Position Size (Lots) = (Account Equity × Risk %) / (|Entry Price - Stop Loss| × Point Value)
          </code>
          <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
            Example: On a $100,000 account with 1.0% risk ($1,000) on XAUUSD, with Entry at $2,642.50 and Stop Loss at $2,628.00 (Risk Distance = $14.50, Point Value = $100/lot):
            <br />
            <code>Lot Size = $1,000 / ($14.50 × 100) = 0.69 Lots.</code>
          </p>
        </div>
      </section>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs/signals-and-execution" className="pill g sm">
          ← Signals &amp; VPS Execution
        </Link>
        <Link href="/docs/broker-integration" className="pill sm">
          Next: Broker Integration &amp; APIs →
        </Link>
      </div>
    </article>
  );
}

