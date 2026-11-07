import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { connection } from "next/server";
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
  await connection();
  const [plans, strategies, user] = await Promise.all([
    db.getPlans(),
    db.getStrategies({ includeDrafts: false }),
    getSession(),
  ]);

  const params = searchParams ? await searchParams : undefined;

  let userEntitlements: any[] = [];
  let userOrders: any[] = [];
  if (user) {
    const [rawEnts, ords] = await Promise.all([
      db.getUserEntitlements(user.id),
      db.getUserOrders(user.id),
    ]);
    const now = new Date();
    userEntitlements = rawEnts.map((e) => {
      const isExpired = now > new Date(e.expiryTime) || e.status === "EXPIRED";
      const msLeft = new Date(e.expiryTime).getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      return {
        id: e.id,
        planId: e.planId,
        strategyId: e.strategyId,
        entitlementType: e.entitlementType,
        expiryTime: e.expiryTime ? new Date(e.expiryTime).toISOString() : undefined,
        daysLeft: isExpired ? 0 : daysLeft,
        isActive: !isExpired && e.status === "ACTIVE" && e.entitlementType === "PAID",
      };
    });
    userOrders = ords;
  }

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
            initialEntitlements={userEntitlements}
            initialOrders={userOrders}
          />
        </div>
      </section>
    </div>
  );
}
