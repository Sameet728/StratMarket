import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PricingClient } from "./PricingClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Plans & Direct Checkout — StratMarket by Elvaris Capital",
  description:
    "Institutional access passes and direct subscription checkout for single strategies or the complete quantitative trading suite.",
};

export const instant = false;

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; strategy?: string }>;
}) {
  const [plans, strategies, user] = await Promise.all([
    db.getPlans(),
    db.getStrategies({ includeDrafts: false }),
    getSession(),
  ]);

  const params = searchParams ? await searchParams : undefined;

  const serializedStrategies = strategies.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    implementationType: s.implementationType,
    instrument: s.instrument,
    timeframe: s.timeframe,
    winRate: s.metrics.winRate,
    profitFactor: s.metrics.profitFactor,
    maxDrawdown: s.metrics.maxDrawdown,
    netReturn: s.metrics.netReturn,
  }));

  return (
    <div className="page" id="p-pricing">
      <section className="b" style={{ padding: "80px 0 100px" }}>
        <div className="wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <PricingClient
            plans={plans}
            strategies={serializedStrategies}
            initialUser={user ? { id: user.id, name: user.name, email: user.email } : null}
            initialPlanSlug={params?.plan}
            initialStrategyId={params?.strategy}
          />
        </div>
      </section>
    </div>
  );
}
