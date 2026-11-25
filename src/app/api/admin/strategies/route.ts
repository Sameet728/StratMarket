import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { extractPineMetadata } from "@/lib/pine/pine-interpreter";
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

// Minimal-required schema: Name is required; everything else (metrics, description, report, slug, params) is optional!
const CreateStrategySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Strategy name is required (min 2 chars)"),
  slug: z.string().optional(),
  pineScriptCode: z.string().optional(),
  implementationType: z.enum(["PYTHON", "PINE_SCRIPT"]).default("PINE_SCRIPT"),
  instrument: z.string().optional(),
  timeframe: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  visibilityStatus: z.enum(["PUBLIC", "PRIVATE", "DRAFT", "ARCHIVED"]).default("PRIVATE"),
  currentVersion: z.string().optional().default("1.0.0"),
  trialEligibility: z.boolean().optional().default(true),
  netProfitUsd: z.string().optional(),
  metrics: z
    .object({
      netReturn: z.number().optional(),
      maxDrawdown: z.number().optional(),
      profitFactor: z.number().optional(),
      winRate: z.number().optional(),
      calmarRatio: z.number().optional(),
      totalTrades: z.number().int().optional(),
      averageTrade: z.number().optional(),
      sharpeRatio: z.number().optional(),
      backtestPeriod: z.string().optional(),
      transactionCosts: z.string().optional(),
      slippageAssumptions: z.string().optional(),
      dataSource: z.string().optional(),
      validationType: z.enum(["BACKTESTED", "SIMULATED", "PAPER_TRADED", "FORWARD_TESTED", "LIVE"]).optional(),
      isDemo: z.boolean().optional(),
    })
    .optional(),
  researchReport: z
    .object({
      hypothesis: z.string().optional(),
      methodology: z.string().optional(),
      riskRules: z.string().optional(),
      knownLimitations: z.string().optional(),
      dataCleaning: z.string().optional(),
      executionProtocol: z.string().optional(),
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

// POST /api/admin/strategies — create a new strategy (Name + optional Pine Code + optional Report)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = CreateStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid strategy data", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const pineCode = data.pineScriptCode?.trim() || undefined;
    const meta = pineCode ? extractPineMetadata(pineCode) : null;

    if (pineCode && meta && !meta.parseValid) {
      return NextResponse.json(
        { error: `Pine Script syntax error: ${meta.parseError || "Unable to parse code"}` },
        { status: 400 }
      );
    }

    const instrument = (data.instrument && data.instrument.trim()) || meta?.detectedInstrument || "XAUUSD";
    const timeframe = (data.timeframe && data.timeframe.trim()) || meta?.detectedTimeframe || "M15";
    const category = (data.category && data.category.trim()) || "Systematic";
    const cleanSlug =
      (data.slug && data.slug.trim()) ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "");

    const indicatorsDesc =
      meta && meta.detectedIndicators.length > 0 ? ` (${meta.detectedIndicators.join(", ")})` : "";
    const description =
      (data.description && data.description.trim()) ||
      `Automated ${data.implementationType === "PINE_SCRIPT" ? "Pine Script" : "Python"} strategy on ${instrument} ${timeframe}${indicatorsDesc}.`;

    const metrics = {
      netReturn: data.metrics?.netReturn ?? meta?.detectedNetReturn ?? 0,
      maxDrawdown: data.metrics?.maxDrawdown ?? meta?.detectedMaxDrawdown ?? 0,
      profitFactor: data.metrics?.profitFactor ?? meta?.detectedProfitFactor ?? 1.0,
      winRate: data.metrics?.winRate ?? meta?.detectedWinRate ?? 0,
      calmarRatio: data.metrics?.calmarRatio,
      totalTrades: data.metrics?.totalTrades ?? meta?.detectedTotalTrades ?? 0,
      averageTrade: data.metrics?.averageTrade ?? 0,
      sharpeRatio: data.metrics?.sharpeRatio ?? 0,
      backtestPeriod: data.metrics?.backtestPeriod || "Live Forward + Historical",
      transactionCosts: data.metrics?.transactionCosts || "Standard institutional spread",
      slippageAssumptions: data.metrics?.slippageAssumptions || "Confirmed bar-close execution",
      dataSource: data.metrics?.dataSource || "TradingView",
      validationType: data.metrics?.validationType || "BACKTESTED",
      isDemo: data.metrics?.isDemo ?? false,
    };

    const researchReport = {
      hypothesis: data.researchReport?.hypothesis || description,
      methodology:
        data.researchReport?.methodology ||
        `Evaluated live 24x7 on VPS using confirmed ${instrument} ${timeframe} candles${indicatorsDesc}.`,
      riskRules:
        data.researchReport?.riskRules ||
        (meta?.detectedTpDist || meta?.detectedSlDist
          ? `TP: $${meta.detectedTpDist ?? "Dynamic"} / SL: $${meta.detectedSlDist ?? "Dynamic"}`
          : "Defined inside Pine Script order management rules."),
      knownLimitations: data.researchReport?.knownLimitations || "",
      dataCleaning: data.researchReport?.dataCleaning || "Confirmed bar-close execution without lookahead.",
      executionProtocol:
        data.researchReport?.executionProtocol || "24x7 Oracle VPS Pine Script Runtime + Instant Email & Telegram Alerts.",
    };

    const strategy = await db.createStrategy({
      id: data.id,
      name: data.name.trim(),
      slug: cleanSlug,
      implementationType: data.implementationType,
      instrument,
      timeframe,
      category,
      description,
      visibilityStatus: data.visibilityStatus,
      currentVersion: data.currentVersion,
      trialEligibility: data.trialEligibility,
      netProfitUsd: data.netProfitUsd,
      pineScriptCode: pineCode,
      metrics,
      researchReport,
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
        hasPineCode: Boolean(pineCode),
      }),
    });

    return NextResponse.json({ success: true, strategy, detected: meta }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
    }
    console.error("POST /api/admin/strategies error:", error);
    return NextResponse.json({ error: "Failed to create strategy" }, { status: 500 });
  }
}
