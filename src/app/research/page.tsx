import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quant Research Process — StratMarket by Elvaris Capital (elvariscapital.in)",
  description: "Learn how Elvaris Capital generates, backtests, refines, and validates systematic trading strategies.",
};

export default function ResearchPage() {
  return (
    <div className="page" id="p-research">
      <section className="b">
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                color: "#e2b342",
                background: "rgba(226, 179, 66, 0.1)",
                border: "1px solid rgba(226, 179, 66, 0.3)",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              By Elvaris Capital · <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>elvariscapital.in ↗</a>
            </span>
          </div>

          <h2>From hypothesis to strategy.</h2>
          <p className="lede">
            Every candidate strategy undergoes rigorous quant verification by <strong>Elvaris Capital</strong>. No results are curve-fitted, parameters are locked before out-of-sample evaluation, and execution latency is accounted for.
          </p>

          <div style={{ margin: "24px 0 40px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/docs/quantitative-methodology" className="pill sm">
              Read Mathematical Methodology →
            </Link>
            <Link href="/docs" className="pill g sm">
              Documentation Hub
            </Link>
          </div>

          <div className="pipe" id="pipe">
            <div className="st">
              <div className="n">1</div>
              <h3>Generate</h3>
              <p>AI-assisted research turns a quantitative hypothesis into strictly codified testable rules.</p>
            </div>
            <div className="st">
              <div className="n">2</div>
              <h3>Backtest</h3>
              <p>Rules run on tick-level historical data with realistic fixed costs and zero look-ahead bias.</p>
            </div>
            <div className="st">
              <div className="n">3</div>
              <h3>Improve</h3>
              <p>Weak spots and regime transitions are reviewed; improvements are committed as immutable versions.</p>
            </div>
            <div className="st">
              <div className="n">4</div>
              <h3>Validate</h3>
              <p>Multi-window robustness, Monte Carlo stress testing, and out-of-sample periods decide listing approval.</p>
            </div>
          </div>

          <div style={{ marginTop: "80px" }}>
            <h2 style={{ fontSize: "36px" }}>Questions, answered.</h2>

            <details>
              <summary>Are these results real or hypothetical?</summary>
              <p>
                Metrics in the marketplace reflect systematic backtest and paper simulation evaluations using historical tick data. All models are clearly labeled with their validation type (Backtested, Forward-Tested, Simulated). Live trading performance is never fabricated.
              </p>
            </details>

            <details>
              <summary>What is out-of-sample testing?</summary>
              <p>
                A strategy's rules and parameters are discovered exclusively on the training window (70% of dataset). The strategy is then executed blindly on the remaining unseen out-of-sample period (30%) to guarantee it has not memorized historical market noise.
              </p>
            </details>

            <details>
              <summary>Do strategies get versioned?</summary>
              <p>
                Yes. Every parameter change or logic update produces a new immutable version identifier (e.g. v1.2.0). Previous versions, reports, and provenance remain accessible to users so historical accountability is preserved.
              </p>
            </details>

            <details>
              <summary>Where do the algorithmic strategies run?</summary>
              <p>
                The algorithmic strategy signals run in an isolated execution container on an Elvaris Capital 24/7 VPS with sub-millisecond connectivity to institutional liquidity feeds. Real-time TradingView execution bridges communicate with this runner over authenticated, low-latency secure channels.
              </p>
            </details>

            <details>
              <summary>How is slippage and commission calculated?</summary>
              <p>
                Every report incorporates realistic transaction costs (e.g. $2.50/lot commission + 0.5 pip spread) and dynamic slippage assumptions (1.0 pip on entry and stop triggers) to ensure metrics reflect real-world execution drag.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
