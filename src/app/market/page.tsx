import { db } from "@/lib/db";
import { MarketplaceCatalogue } from "@/components/MarketplaceCatalogue";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategy Marketplace — StratMarket by Elvaris Capital",
  description: "Browse systematic Pine Script trading strategies. Filter by instrument, timeframe, and category with audited backtest reports.",
};

export default async function MarketPage() {
  const strategies = await db.getStrategies({ includeDrafts: false });

  return (
    <div className="page" id="p-market">
      <section className="b">
        <div className="wrap">
          <h2>Marketplace</h2>
          <p className="lede">
            Quantitative Pine Script strategies evaluated by the Elvaris Capital quant engine. Real database-backed queries with multi-dimensional filtering, provenance data, and open-access live charting.
          </p>
          <MarketplaceCatalogue initialStrategies={strategies} />
        </div>
      </section>
    </div>
  );
}
