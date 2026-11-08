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
    title: `${strategy.name} (${strategy.id}) Live Chart — StratMarket by Elvaris Capital (elvariscapital.in)`,
    description: `Interactive LuxAlgo Vela charting terminal with live market data and private Pine Script execution overlays for ${strategy.name} (${strategy.instrument} ${strategy.timeframe}) by Elvaris Capital (https://elvariscapital.in).`,
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

  // 2. Open Access: All authenticated traders receive instant full access
  return (
    <main className="chart-page-fullscreen">
      <StrategyChart
        strategyId={strategy.id}
        initialUser={{ id: user.id, name: user.name, email: user.email }}
        initialHasAccess={true}
        initialTrialStatus="ACTIVE"
        initialDaysLeft={365}
        initialHasPaid={true}
        initialTrialExpiry={null}
      />
    </main>
  );
}
