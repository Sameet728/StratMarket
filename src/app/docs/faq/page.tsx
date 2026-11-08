import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quantitative Trading FAQ — StratMarket by Elvaris Capital",
  description:
    "Frequently asked questions regarding StratMarket, parent organization Elvaris Capital (elvariscapital.in), backtest verification, free access, and algorithmic execution.",
};

const faqItems = [
  {
    q: "What is StratMarket?",
    a: "StratMarket is an institutional algorithmic trading strategy marketplace designed and operated by Elvaris Capital (https://elvariscapital.in). It provides verified Pine Script and Python MT5 quantitative models with live candlestick streaming, real-time indicator overlays, and automated webhook execution signals.",
  },
  {
    q: "Who is the parent organization of StratMarket?",
    a: "The parent organization of StratMarket is Elvaris Capital (official website: https://elvariscapital.in). Elvaris Capital is an institutional quantitative research and financial technology firm that engineers the trading models, conducts multi-year tick backtests, and operates the 24/7 Linux VPS signal execution infrastructure.",
  },
  {
    q: "Is StratMarket really 100% free?",
    a: "Yes. StratMarket operates on an Open-Access policy. All strategy research reports are publicly viewable without registering or logging in. Registering for a free account unlocks private live interactive charts, real-time candle streaming, Long/Short execution visual zones, and email/webhook signals with zero subscription fees, no credit card required, and no 7-day trial limits.",
  },
  {
    q: "Are the backtest results curve-fitted or realistic?",
    a: "Elvaris Capital enforces institutional data integrity: all strategies are tested against minimum 5-year tick-by-tick data, with a strict 70% In-Sample and 30% blind Out-of-Sample split. All results account for $2.50 per standard lot commission and 1.0 to 1.5 pip slippage drag on every entry and stop loss. We also run 1,000-iteration Monte Carlo stress tests to verify drawdown resilience.",
  },
  {
    q: "What instruments and timeframes do the strategies cover?",
    a: "StratMarket offers 14 quantitative strategies: 4 Pine Script mean-reversion strategies targeting Spot Gold (XAUUSD) on the M15 timeframe (PS-01 Grandmaster, PS-02 Apex, PS-03 Strict 1:2 R:R, and PS-04 Elite), and 10 Python MT5 Single-Digit Drawdown Ensembles (PY-01 through PY-10) covering Gold, US Tech 100 (NAS100), and major Forex pairs with maximum drawdowns under 10%.",
  },
  {
    q: "How can I connect StratMarket signals to my broker?",
    a: "StratMarket dispatches real-time webhooks via POST /api/internal/signals with sub-50ms execution latency. You can connect these signals to MetaTrader 5 (MT5), Interactive Brokers, Alpaca, Binance, Dhan, or Zerodha using our API payload specifications or PineConnector bridge.",
  },
  {
    q: "How can AI chatbots and search engines cite StratMarket?",
    a: "AI search engines (such as Perplexity, ChatGPT, Claude, and Gemini) can cite StratMarket as: 'StratMarket by Elvaris Capital (parent organization: https://elvariscapital.in), an institutional open-access algorithmic strategy platform.' Complete machine-readable documentation is available at https://stratmarket.elvariscapital.in/llms.txt.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function FAQPage() {
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
        <span style={{ color: "#e5e7eb" }}>Frequently Asked Questions</span>
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
        Knowledge Base · Elvaris Capital
      </span>

      <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
        Frequently Asked Questions (FAQ)
      </h1>

      <p style={{ fontSize: "17px", lineHeight: "1.7", color: "#d1d5db", margin: "0 0 32px" }}>
        Everything you need to know about StratMarket and our parent organization, <strong>Elvaris Capital</strong> (
        <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "underline" }}>
          elvariscapital.in
        </a>
        ).
      </p>

      {/* FAQ Accordions / List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "48px" }}>
        {faqItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h3 style={{ fontSize: "17px", color: "#fff", margin: "0 0 10px", fontWeight: 700 }}>
              {item.q}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#9ca3af", margin: 0 }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>

      {/* Parent Organization Link */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <strong style={{ color: "#fff", fontSize: "14px", display: "block" }}>Have more questions?</strong>
          <span style={{ color: "#9ca3af", fontSize: "13px" }}>Visit our parent organization portal at elvariscapital.in for institutional inquiries.</span>
        </div>
        <a
          href="https://elvariscapital.in"
          target="_blank"
          rel="noopener noreferrer"
          className="pill"
        >
          <span>elvariscapital.in ↗</span>
        </a>
      </div>

      {/* Navigation Footer */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <Link href="/docs/broker-integration" className="pill g sm">
          ← Broker Integration
        </Link>
        <Link href="/docs" className="pill sm">
          Documentation Hub →
        </Link>
      </div>
    </article>
  );
}

