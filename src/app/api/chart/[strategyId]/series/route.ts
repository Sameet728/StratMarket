import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { tradingViewAdapter } from "@/lib/market-data";
import { strategyExecutionRunner } from "@/lib/strategy-execution";

interface Props {
  params: Promise<{
    strategyId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { strategyId } = await params;
    if (!strategyId) {
      return NextResponse.json({ success: false, error: "Strategy ID is required" }, { status: 400 });
    }

    const strategy = await db.getStrategyBySlug(strategyId);
    if (!strategy) {
      return NextResponse.json({ success: false, error: "Strategy not found in catalogue" }, { status: 404 });
    }

    // 1. Strict Authentication Check: Must be logged in
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Sign in required to stream live strategy charts and execution signals.",
          code: "UNAUTHORIZED",
          paywallType: "SIGNIN_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Open Access: All authenticated traders have full access to live streaming data
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "1500", 10);
    const timeframe = searchParams.get("timeframe") || strategy.timeframe;

    // Fetch authoritative live/historical market candles
    const candles = await tradingViewAdapter.getHistoricalBars(
      strategy.instrument,
      timeframe,
      count
    );

    // Execute strategy in private server environment
    const contract = strategyExecutionRunner.execute(strategy, candles);

    // Fetch live signals stored in the database (ingested from 24x7 VPS runner)
    const storedSignals = await db.getSignals(strategy.id, 50);

    return NextResponse.json({
      success: true,
      contract,
      candles,
      storedSignals,
    });
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("GET /api/chart/[strategyId]/series error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute strategy series" },
      { status: 500 }
    );
  }
}
