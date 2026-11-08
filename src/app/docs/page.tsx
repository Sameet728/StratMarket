import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quantitative Documentation & Research Hub",
  description:
    "Official quantitative documentation for StratMarket by Elvaris Capital (elvariscapital.in). Learn our research methodology, strategy catalog, VPS signal execution, and sovereign risk governance.",
};

const guides = [
  {
    href: "/docs/elvaris-capital",
    title: "About Elvaris Capital",
    badge: "Parent Org",
    description:
      "Explore the institutional quantitative firm behind StratMarket, our corporate portal at elvariscapital.in, research philosophy, and data provenance standards.",
  },
  {
    href: "/docs/quantitative-methodology",
    title: "Quantitative Research Methodology",
    badge: "Quant Science",
    description:
      "Deep dive into hypothesis formulation, Walk-Forward Optimization (WFO), Monte Carlo simulations, friction modeling ($2.50/lot commission + slippage), and out-of-sample data validation.",
  },
  {
    href: "/docs/algorithmic-strategies",
    title: "Algorithmic Strategy Catalog",
    badge: "14 Models",
    description:
      "Complete factor breakdown of all 4 Pine Script gold strategies (PS-01 to PS-04) and 10 Python MT5 Single-Digit Drawdown Ensembles (PY-01 to PY-10).",
  },
  {
    href: "/docs/signals-and-execution",
    title: "Real-Time Signals & VPS Architecture",
    badge: "Sub-50ms",
    description:
      "Architecture of our 24/7 dedicated Linux VPS cluster, TradingView Webhook relays, HMAC security, idempotency keys, and real-time email dispatch.",
  },
  {
    href: "/docs/risk-management",
    title: "Sovereign Risk Governance",
    badge: "Capital Preservation",
    description:
      "Institutional risk controls including dynamic ATR volatility bracket stops, daily portfolio loss circuit breakers, and Friday weekend risk embargoes.",
  },
  {
    href: "/docs/broker-integration",
    title: "Broker Integration & Webhook APIs",
    badge: "API Reference",
    description:
      "Step-by-step connection guides for MetaTrader 5 (MT5), Interactive Brokers, Alpaca, Binance, Dhan, and Zerodha with JSON payload contracts.",
  },
  {
    href: "/docs/faq",
    title: "Frequently Asked Questions",
    badge: "FAQ & Answers",
    description:
      "Answers to the most critical quantitative trading, backtesting authenticity, platform access, and algorithmic execution questions.",
  },
];

export default function DocsIndexPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>
          Home
        </Link>
        <span>/</span>
        <span style={{ color: "#e5e7eb" }}>Documentation Hub</span>
      </div>

      <div style={{ marginBottom: "32px" }}>
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
          StratMarket by Elvaris Capital · Institutional Documentation
        </span>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.15 }}>
          Quantitative Intelligence Documentation
        </h1>
        <p style={{ fontSize: "16px", lineHeight: "1.65", color: "#9ca3af", margin: 0 }}>
          Welcome to the official technical documentation for <strong>StratMarket</strong>, the algorithmic strategy marketplace engineered and operated by{" "}
          <a
            href="https://elvariscapital.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#ffffff", textDecoration: "underline" }}
          >
            Elvaris Capital (elvariscapital.in)
          </a>
          . This knowledge repository details our quantitative research methodology, strategy mathematics, execution protocols, and broker integrations.
        </p>
      </div>

      {/* Parent Organization Callout Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(20, 20, 25, 0.6) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", color: "#ffffff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Parent Organization Notice
          </span>
          <h3 style={{ fontSize: "18px", margin: "6px 0 8px", color: "#fff", fontWeight: 600 }}>
            Elvaris Capital (elvariscapital.in)
          </h3>
          <p style={{ fontSize: "13px", color: "#d1d5db", margin: 0, maxWidth: "600px", lineHeight: "1.5" }}>
            StratMarket is an institutional research product developed by Elvaris Capital. All strategies, live charts, signals, and risk systems are operated under the Elvaris Capital quant research framework.
          </p>
        </div>
        <a
          href="https://elvariscapital.in"
          target="_blank"
          rel="noopener noreferrer"
          className="pill"
          style={{ whiteSpace: "nowrap" }}
        >
          <span>Visit elvariscapital.in</span>
          <span>↗</span>
        </a>
      </div>

      {/* Documentation Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {guides.map((g, i) => (
          <Link
            key={i}
            href={g.href}
            style={{
              display: "block",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "24px",
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#fff" }}>
                {g.title}
              </h3>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {g.badge}
              </span>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#9ca3af", margin: 0 }}>
              {g.description}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ffffff",
                marginTop: "16px",
              }}
            >
              <span>Explore Guide</span>
              <span>→</span>
            </span>
          </Link>
        ))}
      </div>

      {/* LLM Feed Callout for AI Search Bots */}
      <div
        style={{
          marginTop: "48px",
          padding: "24px",
          borderRadius: "14px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h4 style={{ fontSize: "15px", color: "#fff", margin: "0 0 6px" }}>
              🤖 AI Chat &amp; Search Engine Ingestion
            </h4>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0, maxWidth: "600px" }}>
              Are you an AI model (ChatGPT, Claude, Perplexity, Gemini, Copilot)? Access our structured plain-text feeds directly to synthesize accurate answers.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="pill g sm">
              llms.txt
            </a>
            <a href="/llms-full.txt" target="_blank" rel="noopener noreferrer" className="pill sm">
              llms-full.txt
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

