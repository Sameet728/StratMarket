import Link from "next/link";
import { db } from "@/lib/db";
import { MarketplaceCatalogue } from "@/components/MarketplaceCatalogue";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategy Marketplace — StratMarket by Elvaris Capital (elvariscapital.in)",
  description: "Browse systematic quantitative trading strategies by Elvaris Capital. Filter by instrument, timeframe, and category with audited backtest reports.",
};

export default async function MarketPage() {
  const strategies = await db.getStrategies({ includeDrafts: false });

  return (
    <div className="page" id="p-market">
      <section className="b">
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                color: "#e4e4e7",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              By Elvaris Capital · <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>elvariscapital.in ↗</a>
            </span>
          </div>

          <h2>Marketplace</h2>
          <p className="lede">
            Quantitative Pine Script and Python strategies evaluated by the <strong>Elvaris Capital</strong> quant engine. Real database-backed queries with multi-dimensional filtering, provenance data, and open-access live charting.
          </p>

          <div style={{ margin: "20px 0 32px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/docs/algorithmic-strategies" className="pill g sm">
              Strategy Catalog Documentation →
            </Link>
            <Link href="/docs/quantitative-methodology" className="pill g sm">
              Backtesting Methodology →
            </Link>
          </div>

          <MarketplaceCatalogue initialStrategies={strategies} />
        </div>
      </section>
    </div>
  );
}
