// StratMarket Autonomous Trade Reconciliation Watchdog
// Reconciles database signal history with visual chart execution boxes.
// NOTE: Reconciled historical signals are recorded into the database for audit/chart parity ONLY.
// They DO NOT dispatch subscriber emails or execute live MT5 broker orders.

import { db } from "@/lib/db";
import { tradingViewAdapter } from "@/lib/market-data";
import { strategyExecutionRunner } from "./runner";
import { STRATEGY_BASE_TRADES } from "@/lib/trade-lifecycle";

let isReconciling = false;
const activeReconciliationLocks = new Set<string>();

export interface ReconciliationReport {
  strategyId: string;
  checkedTrades: number;
  missingEntriesDispatched: number;
  missingExitsDispatched: number;
  errors: string[];
}

export async function reconcileStrategySignals(rawStrategyId: string): Promise<ReconciliationReport> {
  const strategyId = rawStrategyId.trim().toUpperCase();
  const report: ReconciliationReport = {
    strategyId,
    checkedTrades: 0,
    missingEntriesDispatched: 0,
    missingExitsDispatched: 0,
    errors: [],
  };

  if (activeReconciliationLocks.has(strategyId)) {
    return report;
  }

  activeReconciliationLocks.add(strategyId);

  try {
    const strategy = await db.getStrategyBySlug(strategyId);
    if (!strategy || strategy.visibilityStatus !== "PUBLIC") {
      return report;
    }

    // 1. Fetch authoritative market candles (last 250 bars is sufficient to capture recent days)
    const candles = await tradingViewAdapter.getHistoricalBars(
      strategy.instrument,
      strategy.timeframe,
      250
    );

    if (!candles || candles.length < 50) {
      return report;
    }

    // 2. Execute authoritative strategy rules to get definitive chart trade boxes
    const contract = strategyExecutionRunner.execute(strategy, candles);
    const existingSignals = await db.getSignals(strategy.id, 150);

    const baseTrades = STRATEGY_BASE_TRADES[strategy.id] || 35;
    const nowMs = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    // Filter to trades generated within the last 3 days
    const recentBoxes = (contract.tradeBoxes || []).filter((b) => {
      const t = typeof b.entryTime === "number" ? b.entryTime : new Date(b.entryTime).getTime();
      return nowMs - t <= THREE_DAYS_MS;
    });

    report.checkedTrades = recentBoxes.length;

    for (let idx = 0; idx < recentBoxes.length; idx++) {
      const box = recentBoxes[idx];
      const entryTimeMs = typeof box.entryTime === "number" ? box.entryTime : new Date(box.entryTime).getTime();
      const exitTimeMs = box.exitTime ? (typeof box.exitTime === "number" ? box.exitTime : new Date(box.exitTime).getTime()) : undefined;

      const direction: "LONG" | "SHORT" = box.type === "LONG" ? "LONG" : "SHORT";

      // ─── A. CHECK & RECONCILE MISSING ENTRY ─────────────────────────────
      const hasEntrySignal = existingSignals.some((s) => {
        if (s.signalType !== "ENTRY") return false;
        const sTime = new Date(s.timestamp).getTime();
        const timeDiffMinutes = Math.abs(sTime - entryTimeMs) / (1000 * 60);
        const priceDiff = Math.abs((s.entryPrice || 0) - box.entryPrice);
        return (timeDiffMinutes <= 45 && priceDiff <= 0.5) || s.sourceEventId?.includes(String(entryTimeMs));
      });

      if (!hasEntrySignal) {
        try {
          const entryEventId = `auto_rec_${strategy.id.toLowerCase()}_entry_${entryTimeMs}`;
          // Ingest into database quietly for chart parity (NO email alert, NO MT5 relay)
          const ingestResult = await db.ingestVpsSignal({
            sourceEventId: entryEventId,
            strategyId: strategy.id,
            strategyVersion: strategy.currentVersion || "1.0.0",
            instrument: strategy.instrument,
            timeframe: `M${strategy.timeframe}`,
            signalType: "ENTRY",
            direction,
            timestamp: new Date(entryTimeMs).toISOString(),
            entryPrice: box.entryPrice,
            stopLoss: box.slPrice,
            targetPrice: box.tpPrice,
            signalProvenance: "STRATMARKET_HISTORICAL_PARITY_SYNC",
          });

          report.missingEntriesDispatched++;
          existingSignals.unshift(ingestResult.signal);
        } catch (err: any) {
          if (err?.message !== "DUPLICATE_SOURCE_EVENT_ID") {
            report.errors.push(`Entry sync error for ${strategy.id}: ${err?.message || err}`);
          }
        }
      }

      // ─── B. CHECK & RECONCILE MISSING EXIT (TP / SL) ────────────────────
      if (exitTimeMs && box.exitPrice) {
        const exitSignalType: "TAKE_PROFIT" | "STOP_LOSS" = box.isWin ? "TAKE_PROFIT" : "STOP_LOSS";

        const hasExitSignal = existingSignals.some((s) => {
          if (s.signalType !== exitSignalType) return false;
          const sTime = new Date(s.timestamp).getTime();
          const timeDiffMinutes = Math.abs(sTime - exitTimeMs) / (1000 * 60);
          return timeDiffMinutes <= 45 || s.sourceEventId?.includes(String(exitTimeMs));
        });

        if (!hasExitSignal) {
          try {
            const exitEventId = `auto_rec_${strategy.id.toLowerCase()}_${box.isWin ? "tp" : "sl"}_${exitTimeMs}`;
            // Ingest into database quietly for chart parity (NO email alert, NO MT5 relay)
            const ingestResult = await db.ingestVpsSignal({
              sourceEventId: exitEventId,
              strategyId: strategy.id,
              strategyVersion: strategy.currentVersion || "1.0.0",
              instrument: strategy.instrument,
              timeframe: `M${strategy.timeframe}`,
              signalType: exitSignalType,
              direction,
              timestamp: new Date(exitTimeMs).toISOString(),
              entryPrice: box.entryPrice,
              stopLoss: exitSignalType === "STOP_LOSS" ? box.exitPrice : undefined,
              targetPrice: exitSignalType === "TAKE_PROFIT" ? box.exitPrice : undefined,
              signalProvenance: "STRATMARKET_HISTORICAL_PARITY_SYNC",
            });

            report.missingExitsDispatched++;
            existingSignals.unshift(ingestResult.signal);
          } catch (err: any) {
            if (err?.message !== "DUPLICATE_SOURCE_EVENT_ID") {
              report.errors.push(`Exit sync error for ${strategy.id}: ${err?.message || err}`);
            }
          }
        }
      }
    }
  } catch (error: any) {
    report.errors.push(error?.message || String(error));
  } finally {
    activeReconciliationLocks.delete(strategyId);
  }

  return report;
}

export async function reconcileAllPublicStrategies(): Promise<ReconciliationReport[]> {
  if (isReconciling) {
    return [];
  }

  isReconciling = true;
  try {
    const publicStrategies = ["PS-01", "PS-02", "PS-03"];
    const reports: ReconciliationReport[] = [];

    for (const sid of publicStrategies) {
      try {
        const rep = await reconcileStrategySignals(sid);
        reports.push(rep);
      } catch (err: any) {
        reports.push({
          strategyId: sid,
          checkedTrades: 0,
          missingEntriesDispatched: 0,
          missingExitsDispatched: 0,
          errors: [err?.message || String(err)],
        });
      }
    }

    return reports;
  } finally {
    isReconciling = false;
  }
}
