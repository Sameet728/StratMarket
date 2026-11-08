import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algorithmic Strategy Catalog (PS & PY) — Elvaris Capital",
  description:
    "Complete technical breakdown of all 14 quantitative trading strategies on StratMarket by Elvaris Capital (elvariscapital.in). Pine Script gold strategies and Python MT5 ensembles.",
};

const pineStrategies = [
  {
    id: "PS-01",
    slug: "ps-01",
    name: "Grandmaster",
    instrument: "XAUUSD (Gold)",
    timeframe: "M15",
    category: "Mean reversion",
    ret: "+40.9% (+40.86R)",
    dd: "2.3% (2.34R)",
    pf: "6.11",
    win: "82.6%",
    sharpe: "7.02",
    calmar: "17.5",
    summary: "Proprietary volatility exhaustion envelope with dynamic macro regime gating and asymmetric profit payoff.",
  },
  {
    id: "PS-02",
    slug: "ps-02",
    name: "Apex",
    instrument: "XAUUSD (Gold)",
    timeframe: "M15",
    category: "Mean reversion",
    ret: "+24.9% (+24.93R)",
    dd: "1.4% (1.40R)",
    pf: "9.31",
    win: "88.5%",
    sharpe: "10.71",
    calmar: "17.8",
    summary: "High-conviction mean-reversion with strict volatility clearance. Highest win rate (88.5%) and lowest drawdown in catalog.",
  },
  {
    id: "PS-03",
    slug: "ps-03",
    name: "Strict 1:2 R:R",
    instrument: "XAUUSD (Gold)",
    timeframe: "M15",
    category: "Mean reversion",
    ret: "+33.0% (+33.00R)",
    dd: "2.7% (2.71R)",
    pf: "5.71",
    win: "74.1%",
    sharpe: "6.57",
    calmar: "12.2",
    summary: "Fixed 1:2.0 reward-to-risk bracket strategy providing strong mathematical edge over breakeven.",
  },
  {
    id: "PS-04",
    slug: "ps-04",
    name: "Elite",
    instrument: "XAUUSD (Gold)",
    timeframe: "M15",
    category: "Mean reversion",
    ret: "+24.4% (+24.36R)",
    dd: "1.7% (1.68R)",
    pf: "5.06",
    win: "80.7%",
    sharpe: "5.82",
    calmar: "14.5",
    summary: "Multi-layer statistical bands combined with regime trend alignment filters capturing multi-R swings safely.",
  },
];

const pythonEnsembles = [
  { id: "PY-01", name: "Dual-Engine Alpha", ret: "+498.4%", profit: "+$124,592", dd: "9.12%", pf: "2.14", sharpe: "1.72", desc: "Dual-engine ensemble combining London session breakout with NY mean reversion." },
  { id: "PY-02", name: "Tri-Core Momentum", ret: "+492.1%", profit: "+$123,018", dd: "9.45%", pf: "2.08", sharpe: "1.68", desc: "Triple-engine momentum model with volatility-targeted sizing across Gold and US Tech 100." },
  { id: "PY-03", name: "Quad-Asset Trend", ret: "+489.7%", profit: "+$122,421", dd: "9.35%", pf: "1.99", sharpe: "1.66", desc: "Rank #3 ensemble with high diversification, trend-regime shield, and 10.48 Calmar ratio." },
  { id: "PY-04", name: "Inverse-DD Fleet", ret: "+486.8%", profit: "+$121,693", dd: "9.77%", pf: "2.02", sharpe: "1.69", desc: "Heavy low-drawdown engine concentration designed for rapid recovery from equity dips." },
  { id: "PY-05", name: "Ultra-Shield", ret: "+470.7%", profit: "+$117,681", dd: "9.53%", pf: "2.28", sharpe: "1.70", desc: "Rank #5 highest profit factor (2.28) and shortest loss streak with asymmetric stops." },
  { id: "PY-06", name: "Trend Shield", ret: "+465.3%", profit: "+$116,331", dd: "9.74%", pf: "2.16", sharpe: "1.74", desc: "Balanced multi-session trend capture combining London/NY windows with Friday risk embargo." },
  { id: "PY-07", name: "Multi-Regime", ret: "+463.9%", profit: "+$115,984", dd: "9.80%", pf: "2.04", sharpe: "1.65", desc: "High microstructure regime robustness across hiking cycles, banking turbulence, and trend runs." },
  { id: "PY-08", name: "High-Sharpe Fleet", ret: "+462.2%", profit: "+$115,560", dd: "9.50%", pf: "2.29", sharpe: "1.89", desc: "Top annualized Sharpe ratio (1.89) and exceptionally low equity variance across 5 years." },
  { id: "PY-09", name: "Asian Squeeze", ret: "+460.5%", profit: "+$115,122", dd: "9.96%", pf: "2.21", sharpe: "1.68", desc: "Asian session order flow compression exploitation with dynamic chandelier trailing defense." },
  { id: "PY-10", name: "Low-Loss Fleet", ret: "+460.0%", profit: "+$115,009", dd: "9.43%", pf: "2.11", sharpe: "1.67", desc: "Long-term trend-following engine with low trade frequency and loss clustering mitigation." },
];

export default function AlgorithmicStrategiesPage() {
  return (
    <article>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
        <span>/</span>
        <Link href="/docs" style={{ color: "#9ca3af", textDecoration: "none" }}>Documentation</Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>Strategy Catalog</span>
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
        Verified Quantitative Models · Elvaris Capital
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        Quantitative Strategy Catalog (PS &amp; PY)
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        StratMarket by <strong>Elvaris Capital</strong> (
        <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "underline" }}>
          elvariscapital.in
        </a>
        ) features 14 verified quantitative strategies: 4 specialized Pine Script mean-reversion engines optimized for spot Gold (XAUUSD), and 10 institutional Python MT5 multi-engine fleets with guaranteed single-digit maximum drawdown (&lt; 10%).
      </p>

      {/* Part 1: Pine Script Strategies */}
      <section style={{ marginBottom: "48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ fontSize: "22px", color: "#fff", margin: 0 }}>
            Pine Script Gold Strategies (PS-01 – PS-04)
          </h2>
          <span style={{ fontSize: "12px", color: "#ffffff", background: "rgba(255, 255, 255, 0.08)", padding: "3px 10px", borderRadius: "999px" }}>
            XAUUSD · M15 Timeframe
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {pineStrategies.map((s) => (
            <div
              key={s.id}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "#ffffff", fontWeight: 700 }}>
                    {s.id}
                  </span>
                  <h3 style={{ fontSize: "19px", color: "#fff", margin: "2px 0 0" }}>
                    {s.name}
                  </h3>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Link href={`/strategies/${s.slug}`} className="pill g sm">
                    Research Report ↗
                  </Link>
                  <Link href={`/chart/${s.id.toLowerCase()}`} className="pill sm">
                    Live Chart →
                  </Link>
                </div>
              </div>

              <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: "1.6", margin: "0 0 16px" }}>
                {s.summary}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: "12px",
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div>
                  <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", display: "block" }}>Return</span>
                  <strong style={{ fontSize: "14px", color: "#10b981" }}>{s.ret}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", display: "block" }}>Max DD</span>
                  <strong style={{ fontSize: "14px", color: "#e5e7eb" }}>{s.dd}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", display: "block" }}>Profit Factor</span>
                  <strong style={{ fontSize: "14px", color: "#ffffff" }}>{s.pf}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", display: "block" }}>Win Rate</span>
                  <strong style={{ fontSize: "14px", color: "#e5e7eb" }}>{s.win}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", display: "block" }}>Sharpe</span>
                  <strong style={{ fontSize: "14px", color: "#e5e7eb" }}>{s.sharpe}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", display: "block" }}>Calmar</span>
                  <strong style={{ fontSize: "14px", color: "#e5e7eb" }}>{s.calmar}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Part 2: Python MT5 Ensembles */}
      <section style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ fontSize: "22px", color: "#fff", margin: 0 }}>
            Python MT5 Single-Digit Drawdown Ensembles (PY-01 – PY-10)
          </h2>
          <span style={{ fontSize: "12px", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "3px 10px", borderRadius: "999px" }}>
            Hard Max DD &lt; 10% · 5-Year Tick Provenance
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", color: "#d1d5db" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left", color: "#9ca3af", fontSize: "11px", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 8px" }}>ID &amp; Name</th>
                <th style={{ padding: "12px 8px" }}>Net Profit</th>
                <th style={{ padding: "12px 8px" }}>Max DD</th>
                <th style={{ padding: "12px 8px" }}>Profit Factor</th>
                <th style={{ padding: "12px 8px" }}>Sharpe</th>
                <th style={{ padding: "12px 8px" }}>Engine Focus</th>
              </tr>
            </thead>
            <tbody>
              {pythonEnsembles.map((py) => (
                <tr key={py.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "12px 8px", fontWeight: 600, color: "#fff" }}>
                    <span style={{ color: "#ffffff", marginRight: "6px" }}>{py.id}</span>
                    {py.name}
                  </td>
                  <td style={{ padding: "12px 8px", color: "#10b981", fontWeight: 600 }}>{py.profit}</td>
                  <td style={{ padding: "12px 8px" }}>{py.dd}</td>
                  <td style={{ padding: "12px 8px", color: "#ffffff" }}>{py.pf}</td>
                  <td style={{ padding: "12px 8px" }}>{py.sharpe}</td>
                  <td style={{ padding: "12px 8px", color: "#9ca3af", fontSize: "12px", maxWidth: "280px" }}>{py.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs/quantitative-methodology" className="pill g sm">
          ← Research Methodology
        </Link>
        <Link href="/docs/signals-and-execution" className="pill sm">
          Next: Signals &amp; VPS Execution →
        </Link>
      </div>
    </article>
  );
}

