import Link from "next/link";
import { db } from "@/lib/db";
import { StratMarketLogo } from "@/components/StratMarketLogo";
import { TerrainCanvas } from "@/components/TerrainCanvas";
import { AnimatedStats } from "@/components/AnimatedStats";
import { IndexPreview } from "@/components/IndexPreview";
import { ThreeWaysSection } from "@/components/ThreeWaysSection";
import { MarketTicker } from "@/components/MarketTicker";
import { LiveExecutionStage } from "@/components/LiveExecutionStage";

export default async function HomePage() {
  const strategies = await db.getStrategies({ includeDrafts: false });

  return (
    <div className="page" id="p-home">
      {/* Hero Section */}
      <div className="h0">
        <div className="hc">
          <span className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "7px", borderColor: "rgba(163, 230, 53, 0.35)", background: "rgba(163, 230, 53, 0.04)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a3e635", boxShadow: "0 0 8px #a3e635", display: "inline-block" }} />
            <StratMarketLogo size={13} color="#ffffff" />
            <span><b>Product by</b> Elvaris Capital ·{" "}</span>
            <a
              href="https://elvariscapital.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#a3e635", textDecoration: "underline", textUnderlineOffset: "2px" }}
            >
              elvariscapital.in ↗
            </a>
          </span>
          <h1>Research-driven strategies. Built for the markets.</h1>
          <p>
            Discover algorithmic trading strategies developed through AI-assisted research, systematic backtesting and iterative improvement.
          </p>
          <div className="cta" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link className="pill lime" href="/market">
              Explore strategies →
            </Link>
            <Link className="pill g" href="/docs">
              Documentation
            </Link>
            <Link className="pill g" href="/research">
              Our research process
            </Link>
          </div>
        </div>

        {/* Dynamic Terrain Canvas */}
        <div className="tband">
          <TerrainCanvas />
        </div>
        <p className="note" style={{ textAlign: "center", margin: "8px 0 24px" }}>
          Simulated price terrain · illustrative
        </p>

        {/* Live Market Ticker Tape */}
        <MarketTicker />
      </div>

      {/* Live Algorithmic Execution Terminal */}
      <div className="wrap" style={{ marginTop: "40px" }}>
        <LiveExecutionStage />
      </div>

      {/* Stats Counter */}
      <AnimatedStats />

      {/* From Hypothesis to Strategy Pipeline */}
      <section className="b" style={{ paddingBottom: "40px" }}>
        <div className="wrap">
          <h2 style={{ marginBottom: "32px" }}>From hypothesis to strategy.</h2>
          <div className="pipe">
            <div className="st">
              <div className="n">1</div>
              <h3>Generate</h3>
              <p>AI-assisted research turns a hypothesis into testable rules.</p>
            </div>
            <div className="st">
              <div className="n">2</div>
              <h3>Backtest</h3>
              <p>Every candidate runs on historical data with fixed costs.</p>
            </div>
            <div className="st">
              <div className="n">3</div>
              <h3>Improve</h3>
              <p>Weak spots are reviewed; changes become new versions.</p>
            </div>
            <div className="st">
              <div className="n">4</div>
              <h3>Validate</h3>
              <p>Robustness and out-of-sample tests decide what is listed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Index Preview */}
      <section className="b">
        <div className="wrap">
          <h2>The index.</h2>
          <p className="lede">
            A first look at the catalogue. Hover a row for a preview, click to open the research report. Metrics are illustrative.
          </p>
          <IndexPreview initialStrategies={strategies} />
          <p style={{ marginTop: "32px" }}>
            <Link className="pill lime" href="/market">
              View all strategies →
            </Link>
          </p>
        </div>
      </section>

      {/* Three Ways to Use a Strategy */}
      <ThreeWaysSection />

      {/* Elvaris Capital Parent Organization Authority Section */}
      <section className="b" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(18, 18, 22, 0.5)", padding: "80px 0" }}>
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "48px", alignItems: "center" }}>
            <div>
              <span
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#ffffff",
                  fontWeight: 600,
                  display: "inline-block",
                  marginBottom: "12px",
                }}
              >
                Parent Organization
              </span>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: "1.15", margin: "0 0 16px" }}>
                Built &amp; backed by Elvaris Capital.
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "16px", lineHeight: "1.6", margin: "0 0 24px" }}>
                StratMarket is the proprietary algorithmic strategy flagship of <strong>Elvaris Capital</strong> (
                <a
                  href="https://elvariscapital.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#ffffff", textDecoration: "underline" }}
                >
                  elvariscapital.in
                </a>
                ). Our quantitative laboratory engineers systematic trading models, high-frequency execution bridges, and mathematical risk protocols designed for prop traders, hedge funds, and discerning retail quants.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a
                  href="https://elvariscapital.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>Visit Elvaris Capital (elvariscapital.in)</span>
                  <span>↗</span>
                </a>
                <Link href="/docs/elvaris-capital" className="pill g">
                  About the Quant Lab
                </Link>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "32px",
              }}
            >
              <h3 style={{ fontSize: "18px", marginBottom: "20px", color: "#fff" }}>
                Institutional Quant Standards
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "18px" }}>
                <li style={{ display: "flex", gap: "14px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "700" }}>01.</span>
                  <div>
                    <strong style={{ color: "#e5e7eb", display: "block" }}>Zero Curve-Fitting Guarantee</strong>
                    <span style={{ color: "#9ca3af", fontSize: "13px" }}>All models validated across out-of-sample datasets (30%) and 1,000+ Monte Carlo reshufflings.</span>
                  </div>
                </li>
                <li style={{ display: "flex", gap: "14px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "700" }}>02.</span>
                  <div>
                    <strong style={{ color: "#e5e7eb", display: "block" }}>Realistic Transaction Drag</strong>
                    <span style={{ color: "#9ca3af", fontSize: "13px" }}>Backtests account for $2.50/lot commission, live spreads, and 1.0+ pip slippage drag on execution.</span>
                  </div>
                </li>
                <li style={{ display: "flex", gap: "14px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "700" }}>03.</span>
                  <div>
                    <strong style={{ color: "#e5e7eb", display: "block" }}>Dedicated 24/7 VPS Relay</strong>
                    <span style={{ color: "#9ca3af", fontSize: "13px" }}>Sub-50ms signal dispatch to TradingView webhooks, MetaTrader 5, and institutional FIX endpoints.</span>
                  </div>
                </li>
                <li style={{ display: "flex", gap: "14px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "700" }}>04.</span>
                  <div>
                    <strong style={{ color: "#e5e7eb", display: "block" }}>100% Free Open Access</strong>
                    <span style={{ color: "#9ca3af", fontSize: "13px" }}>Free registration grants full interactive charts and real-time execution signals without paywalls or trial limits.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Open Access Call-To-Action */}
      <section className="b" style={{ paddingTop: 0, paddingBottom: "150px", overflow: "hidden" }}>
        <div className="wrap" style={{ textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: "clamp(40px, 7vw, 104px)" }}>
            Open access quantitative intelligence.
          </h2>
          <p className="lede" style={{ marginInline: "auto" }}>
            Explore institutional-grade quantitative strategies with free live charts and trade execution overlays.
          </p>
          <Link className="pill" href="/market">
            Explore Strategy Marketplace →
          </Link>
        </div>
      </section>
    </div>
  );
}
