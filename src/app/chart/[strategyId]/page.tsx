import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { StrategyChart } from "@/components/chart/StrategyChart";
import type { Metadata } from "next";

interface Props {
  params: Promise<{
    strategyId: string;
  }>;
}

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { strategyId } = await params;
  const strategy = await db.getStrategyBySlug(strategyId);

  if (!strategy) {
    return {
      title: "Strategy Chart — StratMarket by Elvaris Capital",
    };
  }

  return {
    title: `${strategy.name} (${strategy.id}) Live Chart — StratMarket`,
    description: `Interactive LuxAlgo Vela charting terminal with live market data and private Pine Script execution overlays for ${strategy.name} (${strategy.instrument} ${strategy.timeframe}).`,
  };
}

export default async function ChartPage({ params }: Props) {
  await connection();
  const { strategyId } = await params;
  const strategy = await db.getStrategyBySlug(strategyId);

  if (!strategy) {
    notFound();
  }

  // 1. Unauthenticated users cannot view live chart -> Redirect to Sign in
  const user = await getSession();
  if (!user) {
    redirect(`/signin?redirect=/chart/${encodeURIComponent(strategy.id)}`);
  }

  // 2. Check Entitlement and 7-Day Trial status
  const access = await db.checkUserStrategyAccess(user.id, strategy.id);
  const userTrials = await db.getUserTrials(user.id);
  const now = new Date();
  let currentTrial = userTrials.find(
    (t) =>
      t.strategyId.toUpperCase() === strategy.id.toUpperCase() ||
      t.strategyId.toLowerCase() === strategy.slug.toLowerCase()
  );

  // Check resilient trial cookie for serverless environments
  if (!currentTrial) {
    const cookieStore = await cookies();
    const trialCookieVal = cookieStore.get(`stratmarket_trial_${strategy.slug}`)?.value;
    if (trialCookieVal) {
      try {
        const parsed = JSON.parse(trialCookieVal);
        if (parsed.expiryTime && new Date(parsed.expiryTime) > now) {
          currentTrial = {
            id: `trl_cookie_${strategy.id}`,
            userId: user.id,
            strategyId: strategy.id,
            startTime: new Date(),
            expiryTime: new Date(parsed.expiryTime),
            status: "ACTIVE",
            eligibilityResult: "APPROVED",
            associatedEntitlementId: `ent_cookie_${strategy.id}`,
          };
        }
      } catch (_) {}
    }
  }

  const isTrialActive = Boolean(
    currentTrial && currentTrial.status === "ACTIVE" && new Date(currentTrial.expiryTime) > now
  );
  const isExpired = Boolean(
    currentTrial && (currentTrial.status === "EXPIRED" || new Date(currentTrial.expiryTime) <= now)
  );

  const trialStatus = isTrialActive ? "ACTIVE" : isExpired ? "EXPIRED" : "NOT_STARTED";
  const hasAccess = access.hasAccess || isTrialActive;

  const msLeft = currentTrial?.expiryTime ? new Date(currentTrial.expiryTime).getTime() - now.getTime() : 0;
  const daysRemaining = isTrialActive ? Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : 0;

  return (
    <main className="chart-page-fullscreen">
      <StrategyChart
        strategyId={strategy.id}
        initialUser={{ id: user.id, name: user.name, email: user.email }}
        initialHasAccess={hasAccess}
        initialTrialStatus={trialStatus}
        initialDaysLeft={access.daysRemaining || daysRemaining}
        initialHasPaid={access.accessType === "PAID"}
        initialTrialExpiry={currentTrial?.expiryTime ? new Date(currentTrial.expiryTime).toISOString() : null}
      />
    </main>
  );
}
