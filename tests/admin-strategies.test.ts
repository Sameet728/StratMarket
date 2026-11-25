import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { generateVpsSignature } from "@/lib/vps/security";
import { GET as getVpsStrategies } from "@/app/api/internal/vps-strategies/route";
import { NextRequest } from "next/server";

describe("Admin Strategy Management & VPS Auto-Sync", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) {
      try {
        await db.deleteStrategy(id);
      } catch {}
    }
  });

  it("creates, edits, toggles visibility, and deletes a Pine Script strategy end-to-end", async () => {
    // 1. Create as PRIVATE
    const created = await db.createStrategy({
      name: "Vitest Asian Reversal",
      slug: "vitest-asian-reversal",
      implementationType: "PINE_SCRIPT",
      instrument: "XAUUSD",
      timeframe: "M15",
      category: "Mean reversion",
      description: "Automated Vitest strategy verification.",
      visibilityStatus: "PRIVATE",
      currentVersion: "1.0.0",
      trialEligibility: true,
      metrics: {
        netReturn: 32.5,
        maxDrawdown: 1.5,
        profitFactor: 5.2,
        winRate: 84.0,
        calmarRatio: 21.6,
        totalTrades: 30,
        averageTrade: 1.08,
        sharpeRatio: 7.4,
        backtestPeriod: "2026-09 to 2026-11",
        transactionCosts: "Standard",
        slippageAssumptions: "Next bar",
        dataSource: "TradingView",
        validationType: "BACKTESTED",
        isDemo: false,
      },
      researchReport: {
        hypothesis: "Asian liquidity sweep",
        methodology: "2.2-sigma band + RSI",
        riskRules: "$15 TP / $12 SL",
        knownLimitations: "Low holiday volume",
        dataCleaning: "Filtered gaps",
        executionProtocol: "VPS Pine Runner",
      },
      pineParams: {
        bandLength: 24,
        bandMult: 2.2,
        emaMacroLen: 200,
        emaFastLen: 50,
        atrLen: 14,
        offsetVal: 3.5,
        crashFilterAtr: 1.3,
        rsiLen: 14,
        rsiLongThresh: 50,
        rsiShortThresh: 50,
        tpDist: 15.0,
        slDist: 12.0,
        sessionStart: 0,
        sessionEnd: 8,
        excludeHour12: false,
        maxDailyLosses: 1,
        maxDailyTrades: 2,
      },
      reportData: {
        subtitle: "Custom Vitest Tear Sheet",
        bigStats: [{ val: "+32.5%", label: "Net Return" }],
        longStats: { trades: "16", pnl: "+18.0R", winRate: "87.5%", pf: "6.0" },
        shortStats: { trades: "14", pnl: "+14.5R", winRate: "80.0%", pf: "4.5" },
      },
    });
    createdIds.push(created.id);

    expect(created.id).toMatch(/^PS-\d+$/);
    expect(created.visibilityStatus).toBe("PRIVATE");

    // 2. While PRIVATE: hidden from public getStrategies, visible in admin list, excluded from VPS endpoint
    const publicListPrivate = await db.getStrategies({ includeDrafts: false });
    expect(publicListPrivate.some((s) => s.id === created.id)).toBe(false);

    const adminList = await db.getAllStrategiesAdmin();
    expect(adminList.some((s) => s.id === created.id)).toBe(true);

    const ts1 = Date.now().toString();
    const sig1 = generateVpsSignature("", ts1);
    const req1 = new NextRequest("http://localhost:3000/api/internal/vps-strategies", {
      headers: { "x-vps-timestamp": ts1, "x-vps-signature": sig1 },
    });
    const res1 = await getVpsStrategies(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.strategies.some((s: any) => s.id === created.id)).toBe(false);

    // 3. Edit strategy params + make PUBLIC
    const updated = await db.updateStrategy(created.id, {
      description: "Updated Vitest description",
      visibilityStatus: "PUBLIC",
      pineParams: { ...created.pineParams!, tpDist: 17.5 },
    });
    expect(updated.description).toBe("Updated Vitest description");
    expect(updated.visibilityStatus).toBe("PUBLIC");
    expect(updated.pineParams?.tpDist).toBe(17.5);

    // 4. Now PUBLIC: appears in public getStrategies AND in HMAC-authenticated /api/internal/vps-strategies
    const publicListAfter = await db.getStrategies({ includeDrafts: false });
    expect(publicListAfter.some((s) => s.id === created.id)).toBe(true);

    const ts2 = Date.now().toString();
    const sig2 = generateVpsSignature("", ts2);
    const req2 = new NextRequest("http://localhost:3000/api/internal/vps-strategies", {
      headers: { "x-vps-timestamp": ts2, "x-vps-signature": sig2 },
    });
    const res2 = await getVpsStrategies(req2);
    const json2 = await res2.json();
    const synced = json2.strategies.find((s: any) => s.id === created.id);
    expect(synced).toBeDefined();
    expect(synced.tpDist).toBe(17.5);
    expect(synced.timeframe).toBe("15");

    // 4b. Verify chart execution & signal/alert dispatch for dynamic PUBLIC strategy
    const { strategyExecutionRunner } = await import("@/lib/strategy-execution");
    const mockCandles = Array.from({ length: 240 }, (_, i) => ({
      time: 1700000000000 + i * 900000,
      open: 3500,
      high: 3505,
      low: 3495,
      close: 3502,
      volume: 100,
    }));
    const contract = strategyExecutionRunner.execute(updated, mockCandles);
    expect(contract.strategyId).toBe(created.id);
    expect(contract.series.length).toBeGreaterThanOrEqual(5);

    const sigPublic = await db.ingestVpsSignal({
      sourceEventId: `vitest_pub_${Date.now()}`,
      strategyId: created.id,
      instrument: "XAUUSD",
      timeframe: "M15",
      signalType: "ENTRY",
      direction: "LONG",
      entryPrice: 3502.5,
      stopLoss: 3490.5,
      targetPrice: 3520.0,
    });
    expect(sigPublic.notifiedUsersCount).toBeGreaterThan(0);
    expect(sigPublic.subscriberEmails.length).toBeGreaterThan(0);

    // 5. Set PRIVATE and verify signal ingestion stops alerting users, then delete
    await db.updateStrategyStatus(created.id, "PRIVATE");
    const sigPrivate = await db.ingestVpsSignal({
      sourceEventId: `vitest_priv_${Date.now()}`,
      strategyId: created.id,
      instrument: "XAUUSD",
      timeframe: "M15",
      signalType: "ENTRY",
      direction: "SHORT",
      entryPrice: 3510.0,
    });
    expect(sigPrivate.notifiedUsersCount).toBe(0);
    expect(sigPrivate.subscriberEmails.length).toBe(0);

    await db.deleteStrategy(created.id);
    const afterDelete = await db.getStrategyBySlug(created.id);
    expect(afterDelete).toBeNull();
  });

  it("rejects unauthorized requests to /api/internal/vps-strategies", async () => {
    const req = new NextRequest("http://localhost:3000/api/internal/vps-strategies");
    const res = await getVpsStrategies(req);
    expect(res.status).toBe(401);
  });
});
