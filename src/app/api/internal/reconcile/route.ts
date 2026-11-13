import { NextRequest, NextResponse } from "next/server";
import { reconcileAllPublicStrategies, reconcileStrategySignals } from "@/lib/strategy-execution";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get("strategyId");

    let results;
    if (strategyId) {
      const rep = await reconcileStrategySignals(strategyId);
      results = [rep];
    } else {
      results = await reconcileAllPublicStrategies();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      service: "StratMarket Autonomous Watchdog Engine",
      reconciledStrategies: results,
    });
  } catch (error: any) {
    console.error("GET /api/internal/reconcile error:", error);
    return NextResponse.json({ error: error?.message || "Reconciliation failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

