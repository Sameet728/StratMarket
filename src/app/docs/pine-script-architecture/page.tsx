import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pine Script v5 Architecture & Zero-Lookahead Contracts — StratMarket Docs",
  description:
    "Technical documentation on StratMarket's Pine Script v5 execution architecture, confirmed bar-close execution, multi-timeframe indicator plots, and LuxAlgo Vela canvas rendering contracts.",
  keywords: [
    "Pine Script v5 Architecture",
    "TradingView Pine Script Execution",
    "Zero Lookahead Bias",
    "calc_on_every_tick",
    "Vela Canvas Rendering",
    "Elvaris Capital Pine Script",
  ],
  alternates: {
    canonical: "https://stratmarket.elvariscapital.in/docs/pine-script-architecture",
  },
};

export default function PineScriptArchitectureDoc() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Pine Script v5 Architecture & Zero-Lookahead Execution Contracts",
    description:
      "Technical specifications of StratMarket's Pine Script v5 strategy execution engine, zero-repainting enforcement, and LuxAlgo Vela WebGL canvas rendering.",
    url: "https://stratmarket.elvariscapital.in/docs/pine-script-architecture",
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
        <span style={{ color: "#e5e7eb" }}>Pine Script v5 Architecture</span>
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
          Quantitative Engineering
        </span>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          Pine Script v5 Architecture &amp; Zero-Lookahead Contracts
        </h1>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#9ca3af", maxWidth: "800px", margin: 0 }}>
          StratMarket strategies execute on an institutional Pine Script v5 engine designed to eliminate repainting, lookahead bias, and intrabar latency. All indicators and entry conditions strictly conform to confirmed bar-close standards.
        </p>
      </div>

      {/* Content Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.7", color: "#d1d5db" }}>
        
        {/* Section 1 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            1. The Zero-Repainting Imperative (\`calc_on_every_tick = false\`)
          </h2>
          <p style={{ margin: "0 0 12px" }}>
            A notorious pitfall in retail TradingView scripts is intrabar calculation without confirmation. When \`calc_on_every_tick\` is set to true, an entry arrow can appear mid-candle and vanish before the candle closes if the price pulls back.
          </p>
          <p style={{ margin: 0 }}>
            Every strategy in the StratMarket catalog enforces:
          </p>
          <ul style={{ margin: "10px 0 0", paddingLeft: "20px", color: "#a1a1aa" }}>
            <li><strong>Confirmed Bar Closes:</strong> Indicators evaluate exclusively on the closed candle at index \`[1]\`.</li>
            <li><strong>Next-Bar Open Execution:</strong> Fills are modeled on the opening tick of candle \`[0]\`, preventing unrealistic executions at historical highs or lows.</li>
            <li><strong>Friction Modeling:</strong> Every backtest incorporates a mandatory $2.50/lot institutional commission and realistic spread latency buffers.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            2. The 5 Authenticated Plot Overlays
          </h2>
          <p style={{ margin: "0 0 14px" }}>
            When viewing any Pine Script strategy on StratMarket’s live terminal, the backend emits 5 numerical series that stream into the LuxAlgo Vela canvas:
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", color: "#ffffff" }}>Overlay Name</th>
                  <th style={{ padding: "8px 12px", color: "#ffffff" }}>Parameters</th>
                  <th style={{ padding: "8px 12px", color: "#ffffff" }}>Mathematical Role</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 600 }}>Fast Trend EMA</td>
                  <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>Period: 50</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db" }}>Local directional momentum vector.</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 600 }}>Macro Trend EMA</td>
                  <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>Period: 200</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db" }}>Regime filter requiring price &gt; EMA + buffer.</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 600 }}>Upper Volatility Band</td>
                  <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>Length: 28, Mult: 2.1σ</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db" }}>Statistical extreme threshold for breakout expansions.</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 600 }}>Lower Volatility Band</td>
                  <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>Length: 28, Mult: 2.1σ</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db" }}>Statistical support threshold for short momentum.</td>
                </tr>
                <tr>
                  <td style={{ padding: "10px 12px", color: "#ffffff", fontWeight: 600 }}>Volatility Baseline</td>
                  <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>Length: 28 SMA</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db" }}>Equilibrium price center-line.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
            3. LuxAlgo Vela Visual Position Boxes
          </h2>
          <p style={{ margin: "0 0 12px" }}>
            Unlike ordinary charting widgets that draw flat price lines, StratMarket visualizes institutional trades using <strong>Long/Short Position Tool Boxes</strong>:
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#a1a1aa" }}>
            <li><strong>Reward Zone (Take Profit):</strong> Shaded in Electric Cyber Lime with exact +R return badges (+1.16R on PS-03, +1.02R on PS-01, +1.31R on PS-02).</li>
            <li><strong>Risk Zone (Stop Loss):</strong> Shaded in Vibrant Crimson Red marking the maximum risk threshold ($13.75).</li>
            <li><strong>Center Dashed Line:</strong> Pinpointing the execution price at bar open.</li>
          </ul>
        </section>

        {/* Related Navigation */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", paddingTop: "8px" }}>
          <Link href="/chart/PS-01" className="pill" style={{ background: "#ffffff", color: "#000000", fontWeight: 700, textDecoration: "none", border: "none" }}>
            Inspect PS-01 on Live Chart →
          </Link>
          <Link href="/docs/algorithmic-strategies" className="pill g" style={{ textDecoration: "none", color: "#ffffff" }}>
            View Full Strategy Catalog
          </Link>
        </div>

      </div>
    </div>
  );
}

