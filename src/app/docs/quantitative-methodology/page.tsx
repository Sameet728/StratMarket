import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quantitative Research Methodology & Backtest Integrity",
  description:
    "Explore the quantitative backtesting methodology of Elvaris Capital (elvariscapital.in). Walk-Forward Analysis, Monte Carlo simulation, zero look-ahead bias, and Sharpe/Calmar mathematical formulas.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Quantitative Research Methodology & Backtest Integrity — Elvaris Capital",
  description:
    "Detailed guide to mathematical backtesting protocols, friction accounting, and statistical verification employed by Elvaris Capital on StratMarket.",
  author: {
    "@type": "Organization",
    name: "Elvaris Capital",
    url: "https://elvariscapital.in",
  },
  publisher: {
    "@type": "Organization",
    name: "Elvaris Capital",
    url: "https://elvariscapital.in",
  },
};

export default function QuantMethodologyPage() {
  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>Documentation</Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>Quantitative Methodology</span>
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
        Mathematical Rigor · Elvaris Capital Quant Lab
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        Quantitative Research &amp; Backtesting Methodology
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        Every trading strategy listed on StratMarket by <strong>Elvaris Capital</strong> (
        <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#e2b342", textDecoration: "underline" }}>
          elvariscapital.in
        </a>
        ) is subject to strict institutional mathematical protocols. We reject over-optimized curve fitting and enforce zero look-ahead bias, realistic broker execution drag, and multi-regime stress testing.
      </p>

      {/* 4-Stage Pipeline Section */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", color: "#fff", margin: "0 0 20px" }}>
          The Four-Stage Quant Pipeline
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#e2b342", color: "#000", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
              <h3 style={{ fontSize: "16px", color: "#fff", margin: 0 }}>Generate: AI-Assisted Hypothesis Codification</h3>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Strategies start from an economic or statistical thesis (e.g. Asian session liquidity compression followed by London volume breakout, or volatility exhaustion reversion on Gold). Code is written in strict, deterministic rules with zero discretionary human intervention.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#e2b342", color: "#000", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
              <h3 style={{ fontSize: "16px", color: "#fff", margin: 0 }}>Backtest: High-Fidelity Tick Historical Simulation</h3>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Models run against institutional tick data spanning 5,000 to over 100,000 bars. Fixed transaction fees ($2.50 per standard lot) and 1.0 to 1.5 pip slippage drag are applied to every single entry and stop-loss trigger.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#e2b342", color: "#000", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
              <h3 style={{ fontSize: "16px", color: "#fff", margin: 0 }}>Improve: Walk-Forward Optimization &amp; Versioning</h3>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              Parameters are tested across rolling historical windows (Walk-Forward Optimization). Any strategy that demonstrates performance cliffs under minor parameter shifts is discarded. Approved models receive immutable semantic version numbers (e.g. v1.2.0).
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#e2b342", color: "#000", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
              <h3 style={{ fontSize: "16px", color: "#fff", margin: 0 }}>Validate: Blind Out-of-Sample &amp; Monte Carlo Stress Testing</h3>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              The final 30% of data is evaluated blindly as Out-of-Sample (OOS). Furthermore, 1,000 Monte Carlo simulations randomly permute trade orders and test equity curves against catastrophic 99% Value-at-Risk (VaR) scenarios.
            </p>
          </div>
        </div>
      </section>

      {/* Mathematical Formulas Section */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", color: "#fff", margin: "0 0 16px" }}>
          Core Mathematical Metrics
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <span style={{ fontSize: "11px", color: "#e2b342", fontWeight: 700 }}>RISK-ADJUSTED RETURN</span>
            <h3 style={{ fontSize: "18px", color: "#fff", margin: "4px 0 8px" }}>Sharpe Ratio</h3>
            <code style={{ display: "block", background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "6px", fontSize: "12px", color: "#e5e7eb", marginBottom: "8px" }}>
              SR = (E[Rp] - Rf) / σp
            </code>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              Measures annualized excess return per unit of total portfolio volatility. StratMarket strategies range from 1.65 to 10.71.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <span style={{ fontSize: "11px", color: "#e2b342", fontWeight: 700 }}>DRAWDOWN RECOVERY</span>
            <h3 style={{ fontSize: "18px", color: "#fff", margin: "4px 0 8px" }}>Calmar Ratio</h3>
            <code style={{ display: "block", background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "6px", fontSize: "12px", color: "#e5e7eb", marginBottom: "8px" }}>
              CR = Annualized Return / |Max Drawdown|
            </code>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              Quantifies return relative to the single deepest peak-to-trough decline. A Calmar ratio above 5.0 represents elite institutional risk containment.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <span style={{ fontSize: "11px", color: "#e2b342", fontWeight: 700 }}>GROSS EXPECTANCY</span>
            <h3 style={{ fontSize: "18px", color: "#fff", margin: "4px 0 8px" }}>Profit Factor</h3>
            <code style={{ display: "block", background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "6px", fontSize: "12px", color: "#e5e7eb", marginBottom: "8px" }}>
              PF = Gross Profits / Gross Losses
            </code>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              Gross dollar winnings divided by gross dollar losses. PS-02 Apex achieves a 9.31 Profit Factor, and PY-05 achieves 2.28 over 5 years.
            </p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "20px" }}>
            <span style={{ fontSize: "11px", color: "#e2b342", fontWeight: 700 }}>WORST-CASE DROP</span>
            <h3 style={{ fontSize: "18px", color: "#fff", margin: "4px 0 8px" }}>Maximum Drawdown</h3>
            <code style={{ display: "block", background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "6px", fontSize: "12px", color: "#e5e7eb", marginBottom: "8px" }}>
              MDD = (Peak - Trough) / Peak
            </code>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              All 10 Python ensembles are engineered with hard single-digit drawdowns (&lt; 10%), and Pine Script strategies under 3%.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs/elvaris-capital" className="pill g sm">
          ← About Elvaris Capital
        </Link>
        <Link href="/docs/algorithmic-strategies" className="pill sm">
          Next: Strategy Catalog →
        </Link>
      </div>
    </article>
  );
}
