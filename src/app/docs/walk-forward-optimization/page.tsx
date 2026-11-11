import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Walk-Forward Optimization & Anti-Overfitting Protocols — StratMarket Docs",
  description:
    "Explore the quantitative backtesting standards of Elvaris Capital: rolling in-sample vs out-of-sample data splits, Walk-Forward Efficiency (WFE), Monte Carlo simulations, and Deflated Sharpe Ratios.",
  keywords: [
    "Walk Forward Optimization",
    "Anti Overfitting Trading",
    "Quant Backtesting Standards",
    "Deflated Sharpe Ratio",
    "Monte Carlo Simulation Trading",
    "Elvaris Capital Methodology",
  ],
  alternates: {
    canonical: "https://stratmarket.elvariscapital.in/docs/walk-forward-optimization",
  },
};

export default function WalkForwardOptimizationDoc() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Walk-Forward Optimization & Anti-Overfitting Validation Protocols",
    description:
      "Mathematical guidelines and stress-testing protocols used by Elvaris Capital to eliminate curve-fitting in systematic trading strategies.",
    url: "https://stratmarket.elvariscapital.in/docs/walk-forward-optimization",
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
        <span style={{ color: "#e5e7eb" }}>Walk-Forward Optimization</span>
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
          Validation Science
        </span>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          Walk-Forward Optimization &amp; Anti-Overfitting
        </h1>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#9ca3af", maxWidth: "800px", margin: 0 }}>
          Curve-fitting is the silent killer of systematic trading. Elvaris Capital enforces an uncompromised 4-stage empirical validation pipeline to ensure out-of-sample persistence.
        </p>
      </div>

      {/* Content Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.7", color: "#d1d5db" }}>
        
        {/* Stage 1 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            1. The Rolling Walk-Forward Matrix (WFO)
          </h2>
          <p style={{ margin: "0 0 12px" }}>
            Traditional static backtests optimize parameters over the entire historical window, creating the illusion of perfection. Walk-Forward Optimization (WFO) divides historical tick data into rolling sequential blocks:
          </p>
          <ul style={{ margin: "10px 0 16px", paddingLeft: "20px", color: "#a1a1aa" }}>
            <li><strong>In-Sample (IS) Calibration Window (70%):</strong> Parameters are optimized over a trailing 9-month window.</li>
            <li><strong>Out-of-Sample (OOS) Blind Validation (30%):</strong> The calibrated parameter vector is tested on the subsequent 3 months of unseen data.</li>
            <li><strong>Rolling Step:</strong> The window advances 3 months, and the process repeats across multi-year cycles.</li>
          </ul>

          <div style={{ background: "rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "12px", color: "#a3e635", fontWeight: 700, marginBottom: "4px" }}>
              Walk-Forward Efficiency Metric (WFE)
            </div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "14px", color: "#ffffff" }}>
              WFE = (Annualized Return_OOS / Annualized Return_IS) × 100%
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>
              Any strategy with WFE below 70% is immediately rejected and discarded by our quantitative review committee.
            </div>
          </div>
        </section>

        {/* Stage 2 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            2. 1,000-Run Monte Carlo Stress Simulations
          </h2>
          <p style={{ margin: "0 0 14px" }}>
            To measure worst-case tail risk, we execute 1,000 randomized Monte Carlo iterations:
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#a1a1aa" }}>
            <li><strong>Trade Sequence Shuffling:</strong> Permuting the chronological order of trades to evaluate maximum consecutive losing streaks.</li>
            <li><strong>Slippage &amp; Spread Variations:</strong> Randomly expanding execution spreads from 1.5 to 5.0 pips to ensure the mathematical expectancy survives extreme market dislocation.</li>
            <li><strong>95th Percentile Drawdown Constraint:</strong> The 95% worst-case drawdown must remain within acceptable investor risk tolerances (under 5.00R on Pine Script models).</li>
          </ul>
        </section>

        {/* Stage 3 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            3. Deflated Sharpe Ratio (DSR) &amp; Multiple Testing Correction
          </h2>
          <p style={{ margin: "0 0 12px" }}>
            Following the academic framework of Marcos López de Prado, we compute the <strong>Deflated Sharpe Ratio (DSR)</strong>, which mathematically penalizes backtest performance for the number of parameter combinations tested:
          </p>
          <div style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", padding: "14px 18px", fontFamily: "var(--font-mono, monospace)", fontSize: "13px", color: "#a3e635" }}>
            p-Value(DSR) &lt; 0.01 ⇒ 99% Confidence against random data snooping
          </div>
        </section>

        {/* Related Navigation */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", paddingTop: "8px" }}>
          <Link href="/docs/quantitative-methodology" className="pill" style={{ background: "#ffffff", color: "#000000", fontWeight: 700, textDecoration: "none", border: "none" }}>
            Full Research Methodology →
          </Link>
          <Link href="/blog/calmar-ratio-vs-sharpe-ratio-quant-trading" className="pill g" style={{ textDecoration: "none", color: "#ffffff" }}>
            Read: Calmar Ratio vs Sharpe Ratio Guide
          </Link>
        </div>

      </div>
    </div>
  );
}

