import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";

export const PineParamsSchema = z.object({
  bandLength: z.number(),
  bandMult: z.number(),
  emaMacroLen: z.number(),
  emaFastLen: z.number(),
  atrLen: z.number(),
  offsetVal: z.number(),
  crashFilterAtr: z.number(),
  rsiLen: z.number(),
  rsiLongThresh: z.number(),
  rsiShortThresh: z.number(),
  tpDist: z.number(),
  slDist: z.number(),
  sessionStart: z.number(),
  sessionEnd: z.number(),
  excludeHour12: z.boolean(),
  maxDailyLosses: z.number().int(),
  maxDailyTrades: z.number().int(),
});

export const ReportDataSchema = z.object({
  subtitle: z.string().optional(),
  bigStats: z.array(z.object({ val: z.string(), label: z.string() })).optional(),
  mechLede: z.string().optional(),
  mechRows: z
    .array(
      z.object({
        engine: z.string(),
        weight: z.string(),
        soloPnl: z.string(),
        soloPf: z.string(),
        soloDd: z.string(),
        role: z.string(),
      })
    )
    .optional(),
  kpiLede: z.string().optional(),
  kpis: z.array(z.object({ val: z.string(), label: z.string() })).optional(),
  payoff: z
    .object({
      payoffRatio: z.string().optional(),
      avgWin: z.string().optional(),
      avgLoss: z.string().optional(),
      actualWinRate: z.string().optional(),
      breakevenWinRate: z.string().optional(),
      expectancy: z.string().optional(),
      totalPnl: z.string().optional(),
      maxConsecWins: z.number().optional(),
      maxConsecLosses: z.number().optional(),
    })
    .optional(),
  longStats: z.object({ trades: z.string(), pnl: z.string(), winRate: z.string(), pf: z.string() }).optional(),
  shortStats: z.object({ trades: z.string(), pnl: z.string(), winRate: z.string(), pf: z.string() }).optional(),
  regimes: z
    .array(
      z.object({
        name: z.string(),
        period: z.string(),
        trades: z.union([z.string(), z.number()]),
        pnl: z.string(),
        winRate: z.string(),
        pf: z.string(),
        dd: z.string(),
      })
    )
    .optional(),
  yearly: z
    .array(
      z.object({
        year: z.string(),
        trades: z.union([z.string(), z.number()]),
        wl: z.string(),
        winRate: z.string(),
        returnPct: z.string().optional(),
        pnl: z.string().optional(),
      })
    )
    .optional(),
  scriptData: z
    .object({
      mx: z.number().optional(),
      years: z.array(z.tuple([z.string(), z.number()])).optional(),
      pnl: z.record(z.string(), z.array(z.number().nullable())).optional(),
      cnt: z.record(z.string(), z.array(z.number())).optional(),
      tot: z.record(z.string(), z.number()).optional(),
      tc: z.record(z.string(), z.number()).optional(),
    })
    .optional(),
});

const CreateStrategySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().min(2),
  implementationType: z.enum(["PYTHON", "PINE_SCRIPT"]),
  instrument: z.string().min(1),
  timeframe: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  visibilityStatus: z.enum(["PUBLIC", "PRIVATE", "DRAFT", "ARCHIVED"]).default("PRIVATE"),
  currentVersion: z.string().default("1.0.0"),
  trialEligibility: z.boolean().default(true),
  netProfitUsd: z.string().optional(),
  metrics: z.object({
    netReturn: z.number(),
    maxDrawdown: z.number(),
    profitFactor: z.number(),
    winRate: z.number(),
    calmarRatio: z.number().optional(),
    totalTrades: z.number().int(),
    averageTrade: z.number(),
    sharpeRatio: z.number(),
    backtestPeriod: z.string().default(""),
    transactionCosts: z.string().default(""),
    slippageAssumptions: z.string().default(""),
    dataSource: z.string().default("TradingView"),
    validationType: z.enum(["BACKTESTED", "SIMULATED", "PAPER_TRADED", "FORWARD_TESTED", "LIVE"]).default("BACKTESTED"),
    isDemo: z.boolean().default(false),
  }),
  researchReport: z
    .object({
      hypothesis: z.string().default(""),
      methodology: z.string().default(""),
      riskRules: z.string().default(""),
      knownLimitations: z.string().default(""),
      dataCleaning: z.string().default(""),
      executionProtocol: z.string().default(""),
    })
    .optional(),
  pineParams: PineParamsSchema.optional(),
  reportData: ReportDataSchema.optional(),
});

// GET /api/admin/strategies — returns ALL strategies (including PRIVATE) for admin
export async function GET() {
  try {
    await requireAdmin();
    const strategies = await db.getAllStrategiesAdmin();
    return NextResponse.json({ success: true, data: strategies });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }
    console.error("GET /api/admin/strategies error:", error);
    return NextResponse.json({ error: "Failed to load strategies" }, { status: 500 });
  }
}

// POST /api/admin/strategies — create a new strategy
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = CreateStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid strategy data", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const strategy = await db.createStrategy({
      id: data.id,
      name: data.name,
      slug: data.slug,
      implementationType: data.implementationType,
      instrument: data.instrument,
      timeframe: data.timeframe,
      category: data.category,
      description: data.description,
      visibilityStatus: data.visibilityStatus,
      currentVersion: data.currentVersion,
      trialEligibility: data.trialEligibility,
      netProfitUsd: data.netProfitUsd,
      metrics: data.metrics,
      researchReport: data.researchReport || {
        hypothesis: "",
        methodology: "",
        riskRules: "",
        knownLimitations: "",
        dataCleaning: "",
        executionProtocol: "",
      },
      pineParams: data.pineParams,
      reportData: data.reportData,
    });

    await db.createAuditEvent({
      userId: admin.id,
      action: "STRATEGY_CREATED",
      entityType: "STRATEGY",
      entityId: strategy.id,
      details: JSON.stringify({
        name: strategy.name,
        type: strategy.implementationType,
        visibility: strategy.visibilityStatus,
      }),
    });

    return NextResponse.json({ success: true, strategy }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }
    console.error("POST /api/admin/strategies error:", error);
    return NextResponse.json({ error: "Failed to create strategy" }, { status: 500 });
  }
}
