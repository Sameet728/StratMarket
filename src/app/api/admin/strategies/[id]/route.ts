import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { PineParamsSchema, ReportDataSchema } from "../route";

const UpdateStrategySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  implementationType: z.enum(["PYTHON", "PINE_SCRIPT"]).optional(),
  instrument: z.string().min(1).optional(),
  timeframe: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  visibilityStatus: z.enum(["PUBLIC", "PRIVATE", "DRAFT", "ARCHIVED"]).optional(),
  currentVersion: z.string().optional(),
  trialEligibility: z.boolean().optional(),
  netProfitUsd: z.string().optional(),
  metrics: z
    .object({
      netReturn: z.number(),
      maxDrawdown: z.number(),
      profitFactor: z.number(),
      winRate: z.number(),
      calmarRatio: z.number().optional(),
      totalTrades: z.number().int(),
      averageTrade: z.number(),
      sharpeRatio: z.number(),
      backtestPeriod: z.string(),
      transactionCosts: z.string(),
      slippageAssumptions: z.string(),
      dataSource: z.string(),
      validationType: z.enum(["BACKTESTED", "SIMULATED", "PAPER_TRADED", "FORWARD_TESTED", "LIVE"]),
      isDemo: z.boolean(),
    })
    .optional(),
  researchReport: z
    .object({
      hypothesis: z.string(),
      methodology: z.string(),
      riskRules: z.string(),
      knownLimitations: z.string(),
      dataCleaning: z.string(),
      executionProtocol: z.string(),
    })
    .optional(),
  pineParams: PineParamsSchema.optional().nullable(),
  reportData: ReportDataSchema.optional().nullable(),
});

// GET /api/admin/strategies/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const strategy = await db.getStrategyBySlug(id);
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, strategy });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to get strategy" }, { status: 500 });
  }
}

// PATCH /api/admin/strategies/[id] — update a strategy
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid strategy data", details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await db.updateStrategy(id, parsed.data as any);

    await db.createAuditEvent({
      userId: admin.id,
      action: "STRATEGY_UPDATED",
      entityType: "STRATEGY",
      entityId: id,
      details: JSON.stringify({ fields: Object.keys(parsed.data) }),
    });

    return NextResponse.json({ success: true, strategy: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }
    if (error.message === "STRATEGY_NOT_FOUND") {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    console.error("PATCH /api/admin/strategies/[id] error:", error);
    return NextResponse.json({ error: "Failed to update strategy" }, { status: 500 });
  }
}

// DELETE /api/admin/strategies/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await db.deleteStrategy(id);

    await db.createAuditEvent({
      userId: admin.id,
      action: "STRATEGY_DELETED",
      entityType: "STRATEGY",
      entityId: id,
      details: JSON.stringify({ strategyId: id }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }
    if (error.message === "STRATEGY_NOT_FOUND") {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/strategies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete strategy" }, { status: 500 });
  }
}
