import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [trials, rawEntitlements, strategies, orders] = await Promise.all([
      db.getUserTrials(user.id),
      db.getUserEntitlements(user.id),
      db.getStrategies({ includeDrafts: true }),
      db.getUserOrders(user.id),
    ]);

    const now = new Date();

    const enrichedTrials = trials.map((t) => {
      const s = strategies.find(
        (item) => item.id.toUpperCase() === t.strategyId.toUpperCase() || item.slug.toLowerCase() === t.strategyId.toLowerCase()
      );
      const msLeft = new Date(t.expiryTime).getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      const isExpired = now > new Date(t.expiryTime) || t.status === "EXPIRED";

      return {
        ...t,
        strategyName: s?.name || t.strategyId,
        instrument: s?.instrument || "",
        timeframe: s?.timeframe || "",
        category: s?.category || "",
        daysLeft: isExpired ? 0 : daysLeft,
        isExpired,
      };
    });

    const enrichedEntitlements = rawEntitlements.map((e) => {
      const s = e.strategyId
        ? strategies.find(
            (item) => item.id.toUpperCase() === e.strategyId?.toUpperCase() || item.slug.toLowerCase() === e.strategyId?.toLowerCase()
          )
        : null;

      const msLeft = new Date(e.expiryTime).getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      const isExpired = now > new Date(e.expiryTime) || e.status === "EXPIRED";
      const isActive = !isExpired && e.status === "ACTIVE";

      const planName =
        e.planId === "single-strategy"
          ? "Single Strategy"
          : e.planId === "all-access"
          ? "All-Access Portfolio"
          : e.planId === "professional"
          ? "Professional Desk"
          : e.entitlementType === "PAID"
          ? "Pro Subscription"
          : "Trial Access";

      return {
        id: e.id,
        userId: e.userId,
        strategyId: e.strategyId,
        planId: e.planId,
        planName,
        strategyName: s ? s.name : e.strategyId === null ? "All 14 Quant Strategies" : e.strategyId,
        instrument: s?.instrument || (e.strategyId === null ? "Multi-Asset (Gold/Forex/Crypto)" : ""),
        timeframe: s?.timeframe || (e.strategyId === null ? "M5 / M15" : ""),
        entitlementSource: e.entitlementSource,
        entitlementType: e.entitlementType,
        startTime: e.startTime,
        expiryTime: e.expiryTime,
        daysLeft: isExpired ? 0 : daysLeft,
        isExpired,
        isActive,
        status: isExpired ? "EXPIRED" : e.status,
      };
    });

    return NextResponse.json({
      success: true,
      trials: enrichedTrials,
      entitlements: enrichedEntitlements,
      orders,
    });
  } catch (error: any) {
    console.error("GET /api/me/entitlements error:", error);
    return NextResponse.json({ error: "Failed to fetch entitlements" }, { status: 500 });
  }
}
