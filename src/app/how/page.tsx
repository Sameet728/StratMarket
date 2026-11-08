import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works — StratMarket by Elvaris Capital (elvariscapital.in)",
  description: "Step-by-step walkthrough of finding, evaluating, trialing, and connecting trading strategies on StratMarket.",
};

export default function HowPage() {
  return (
    <div className="page" id="p-how">
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

          <h2>How StratMarket works.</h2>
          <p className="lede">From first look to live execution in five systematic steps.</p>

          <div className="tl" id="tl">
            <i style={{ height: "100%" }} />

            <div className="ts">
              <h3>1. Discover a strategy</h3>
              <p>
                Filter the catalogue by asset class (Gold, FX, Nasdaq, Bitcoin, S&amp;P), timeframe (M15 to D1), and strategy philosophy (Trend, Mean Reversion, Breakout, Volatility).
              </p>
            </div>

            <div className="ts">
              <h3>2. Read its research report</h3>
              <p>
                Every strategy includes full quant documentation: the governing economic hypothesis, backtest data provenance, risk caps, parameter stability tests, and limitations.
              </p>
            </div>

            <div className="ts">
              <h3>3. Explore charts and signals</h3>
              <p>
                Inspect detailed equity curves, historical drawdown recovery times, win rates, and profit factors with interactive tooltips and historical signal logs.
              </p>
            </div>

            <div className="ts">
              <h3>4. Free Trader Account</h3>
              <p>
                Sign in or register for free. Get full instant access to real-time charts, candle streaming, and signals with zero subscription fees.
              </p>
            </div>

            <div className="ts">
              <h3>5. Choose how to use it</h3>
              <p>
                Select your preferred delivery mode: view signals on live interactive charts, receive instant email trade alerts, or configure automated broker routing via Alpaca, Binance, or the Virtual Paper Simulator.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "40px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link className="pill" href="/market">
              Explore the strategy catalogue
            </Link>
            <Link className="pill g" href="/docs">
              Read Documentation Hub
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
