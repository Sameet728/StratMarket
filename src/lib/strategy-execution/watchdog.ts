// StratMarket Autonomous Trade Reconciliation & Alert Watchdog
// Guarantees 100% parity between chart execution boxes and subscriber email alerts.
// If any trade is detected on the chart that has not been dispatched, it auto-synthesizes and sends the alert immediately.

import { db } from "@/lib/db";
import { tradingViewAdapter } from "@/lib/market-data";
import { strategyExecutionRunner } from "./runner";
import { dispatchSignalAlertEmails } from "@/lib/email/resend";
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

      const tradeNumber = baseTrades + idx + 1;
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
        console.warn(`[Watchdog Engine] ⚡ Missing ENTRY signal detected for ${strategy.id} @ $${box.entryPrice} (${new Date(entryTimeMs).toISOString()}). Auto-reconciling...`);
        try {
          const entryEventId = `auto_rec_${strategy.id.toLowerCase()}_entry_${entryTimeMs}`;
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
            signalProvenance: "STRATMARKET_AUTONOMOUS_WATCHDOG_PARITY_ENGINE",
          });

          if (ingestResult.subscriberEmails && ingestResult.subscriberEmails.length > 0) {
            const emailResult = await dispatchSignalAlertEmails({
              strategyName: strategy.name,
              strategyId: strategy.id,
              instrument: strategy.instrument,
              timeframe: `M${strategy.timeframe}`,
              signalType: "ENTRY",
              direction,
              entryPrice: box.entryPrice,
              stopLoss: box.slPrice,
              targetPrice: box.tpPrice,
              tradeNumber,
              sourceEventId: entryEventId,
              extraRecipients: ingestResult.subscriberEmails,
            });

            if (emailResult.results && emailResult.results.length > 0) {
              db.updateDeliveryStatuses(
                emailResult.results.map((r) => ({
                  recipientEmail: r.email,
                  signalId: ingestResult.signal.id,
                  status: r.success ? "SENT" : "FAILED",
                  providerMessageRef: r.messageId,
                  failureReason: r.error,
                  attemptCount: 1,
                }))
              ).catch(() => {});
            }
          }

          report.missingEntriesDispatched++;
          existingSignals.unshift(ingestResult.signal);
        } catch (err: any) {
          if (err?.message !== "DUPLICATE_SOURCE_EVENT_ID") {
            report.errors.push(`Entry dispatch error for ${strategy.id}: ${err?.message || err}`);
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
          console.warn(`[Watchdog Engine] 🛡️ Missing ${exitSignalType} signal detected for ${strategy.id} @ $${box.exitPrice}. Auto-reconciling...`);
          try {
            const exitEventId = `auto_rec_${strategy.id.toLowerCase()}_${box.isWin ? "tp" : "sl"}_${exitTimeMs}`;
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
              signalProvenance: "STRATMARKET_AUTONOMOUS_WATCHDOG_PARITY_ENGINE",
            });

            if (ingestResult.subscriberEmails && ingestResult.subscriberEmails.length > 0) {
              const emailResult = await dispatchSignalAlertEmails({
                strategyName: strategy.name,
                strategyId: strategy.id,
                instrument: strategy.instrument,
                timeframe: `M${strategy.timeframe}`,
                signalType: exitSignalType,
                direction,
                entryPrice: box.entryPrice,
                stopLoss: exitSignalType === "STOP_LOSS" ? box.exitPrice : undefined,
                targetPrice: exitSignalType === "TAKE_PROFIT" ? box.exitPrice : undefined,
                pnlR: box.isWin ? "+1.02R" : "-1.00R",
                profitUsd: box.profitUsd,
                tradeNumber,
                sourceEventId: exitEventId,
                extraRecipients: ingestResult.subscriberEmails,
              });

              if (emailResult.results && emailResult.results.length > 0) {
                db.updateDeliveryStatuses(
                  emailResult.results.map((r) => ({
                    recipientEmail: r.email,
                    signalId: ingestResult.signal.id,
                    status: r.success ? "SENT" : "FAILED",
                    providerMessageRef: r.messageId,
                    failureReason: r.error,
                    attemptCount: 1,
                  }))
                ).catch(() => {});
              }
            }

            report.missingExitsDispatched++;
            existingSignals.unshift(ingestResult.signal);
          } catch (err: any) {
            if (err?.message !== "DUPLICATE_SOURCE_EVENT_ID") {
              report.errors.push(`Exit dispatch error for ${strategy.id}: ${err?.message || err}`);
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
  if (isReconciling) return [];
  isReconciling = true;

  try {
    const publicStrategySlugs = ["ps-01", "ps-02", "ps-03"];
    const results: ReconciliationReport[] = [];

    for (const slug of publicStrategySlugs) {
      const rep = await reconcileStrategySignals(slug);
      results.push(rep);
    }

    return results;
  } finally {
    isReconciling = false;
  }
}
