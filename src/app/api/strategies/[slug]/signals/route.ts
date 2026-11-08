import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const strategy = await db.getStrategyBySlug(slug);

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const user = await getSession();
    const isEntitled = Boolean(user);

    const limit = isEntitled ? 50 : 3;
    const signals = await db.getSignals(strategy.id, limit);

    return NextResponse.json({
      success: true,
      strategyId: strategy.id,
      isEntitled,
      accessNotice: isEntitled
        ? "Full real-time signal feed active."
        : "Preview mode: sign in to unlock full real-time signals.",
      count: signals.length,
      data: signals,
    });
  } catch (error: any) {
    console.error("GET /api/strategies/[slug]/signals error:", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
