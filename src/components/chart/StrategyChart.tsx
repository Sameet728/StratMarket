"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChartToolbar } from "./ChartToolbar";
import { StrategyStatusPanel } from "./StrategyStatusPanel";
import { StrategyChartContract } from "@/lib/strategy-execution";
import { MarketCandle } from "@/lib/market-data";

interface StoredSignal {
  id: string;
  strategyId: string;
  instrument: string;
  timeframe: string;
  signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT";
  direction: "LONG" | "SHORT";
  timestamp: string | Date;
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  status: string;
}

interface Props {
  strategyId: string;
}

export function StrategyChart({ strategyId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const mountedKeyRef = useRef<string>("");

  const [contract, setContract] = useState<StrategyChartContract | null>(null);
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [storedSignals, setStoredSignals] = useState<StoredSignal[]>([]);
  const [timeframe, setTimeframe] = useState<string>("15");
  const [status, setStatus] = useState<"LIVE" | "HISTORICAL" | "CONNECTING" | "ERROR">("CONNECTING");
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [loading, setLoading] = useState(true);

  // Alert and Trial states
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [trialStatus, setTrialStatus] = useState<string>("NOT_STARTED");
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [hasPaid, setHasPaid] = useState<boolean>(false);

  // Load alert and trial status
  useEffect(() => {
    fetch("/api/me/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.strategies) {
          const current = data.strategies.find(
            (s: any) =>
              s.id.toUpperCase() === strategyId.toUpperCase() ||
              s.slug.toLowerCase() === strategyId.toLowerCase()
          );
          if (current) {
            setAlertEnabled(Boolean(current.enabled));
            setTrialStatus(current.trialStatus || "NOT_STARTED");
            setDaysLeft(current.daysLeft || 0);
            setHasPaid(Boolean(current.hasPaid));
          }
        }
      })
      .catch(() => {});
  }, [strategyId]);

  const handleToggleAlert = async () => {
    const newEnabled = !alertEnabled;
    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          enabled: newEnabled,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
        }),
      });
      if (res.ok) {
        setAlertEnabled(newEnabled);
        if (trialStatus === "NOT_STARTED") {
          setTrialStatus("ACTIVE");
          setDaysLeft(7);
        }
      }
    } catch (err) {
      console.error("Failed to toggle alert in chart:", err);
    }
  };

  // Mount Vela workspace ONCE per strategy/timeframe — eliminates resetting every 5-10 sec
  useEffect(() => {
    let disposed = false;

    async function loadAndMount() {
      const key = `${strategyId}-${timeframe}`;
      if (mountedKeyRef.current === key && workspaceRef.current) {
        return; // Already initialized for this strategy & timeframe
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch maximum 5,000 bars and strategy execution contract
        const res = await fetch(`/api/chart/${strategyId}/series?count=5000&timeframe=${timeframe}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load strategy chart series");
        }

        if (disposed) return;

        setContract(data.contract);
        setCandles(data.candles || []);
        setStoredSignals(data.storedSignals || []);
        setStatus("LIVE");

        // Clean up prior instance if switching timeframe/strategy
        if (workspaceRef.current) {
          try {
            workspaceRef.current.destroy();
          } catch (_) {}
          workspaceRef.current = null;
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        const { VelaWorkspace } = await import("@luxalgo/vela/workspace");

        if (disposed || !containerRef.current) return;

        // Initialize pure candlestick chart: left charting tools enabled, indicators disabled
        const ws = new VelaWorkspace(containerRef.current, {
          layout: false, // Clean single-chart mode
          theme: "dark",
          symbol: data.contract?.symbol || "XAUUSD",
          timeframe: timeframe,
          live: false, // Prevents mock interval resets
          volume: false, // Clean display without distracting volume columns
          drawingToolbar: true, // Left charting & drawing tools enabled
          indicatorPicker: false, // Prevents user from adding arbitrary indicators
          cells: {
            c1: {
              symbol: data.contract?.symbol || "XAUUSD",
              timeframe: timeframe,
              data: data.candles || [],
            },
          },
        });

        workspaceRef.current = ws;
        mountedKeyRef.current = key;

        // Remove Vela logo & watermark from renderer and DOM
        try {
          ws.chart?.renderer?.set("attribution", false);
        } catch (_) {}

        const purgeAttribution = () => {
          const marks = containerRef.current?.querySelectorAll(
            'a.vela-attribution, .vela-attribution, [class*="vela-attr"], a[href*="velacharts"], .vela-watermark'
          );
          marks?.forEach((el) => el.remove());
        };
        purgeAttribution();
        const obs = new MutationObserver(purgeAttribution);
        obs.observe(containerRef.current, { childList: true, subtree: true });

        // Plot authentic Long/Short Position Tool boxes with exact Entry, SL, and TP prices
        // All drawings are permanently locked (locked: true) so they cannot be moved, dragged, or altered
        // Exit callout (TP HIT / SL HIT) removed per user instruction
        if (data.contract?.tradeBoxes && ws.chart?.drawings) {
          const lockDrawing = (d: any) => {
            if (!d) return;
            try {
              d.locked = true;
              if (d.id) {
                ws.chart?.drawings?.lock(d.id, true);
              }
            } catch (_) {}
          };

          for (const tb of data.contract.tradeBoxes) {
            try {
              const riskAmount = Math.abs(tb.entryPrice - tb.slPrice).toFixed(2);
              const rewardAmount = Math.abs(tb.tpPrice - tb.entryPrice).toFixed(2);

              // 1. Reward Zone Box (Take Profit - Emerald Green) - Locked & unmoveable
              const d1 = ws.chart.drawings.add("box", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.tpPrice },
                ],
                style: {
                  fillColor: "rgba(16, 185, 129, 0.20)",
                  lineColor: "#10b981",
                  lineWidth: 1.5,
                  lineStyle: "solid",
                },
              });
              lockDrawing(d1);

              // 2. Risk Zone Box (Stop Loss - Crimson Red) - Locked & unmoveable
              const d2 = ws.chart.drawings.add("box", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.slPrice },
                ],
                style: {
                  fillColor: "rgba(239, 68, 68, 0.20)",
                  lineColor: "#ef4444",
                  lineWidth: 1.5,
                  lineStyle: "solid",
                },
              });
              lockDrawing(d2);

              // 3. Center Entry Price Line (Dashed) - Locked & unmoveable
              const d3 = ws.chart.drawings.add("trendline", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.entryPrice },
                ],
                style: {
                  lineColor: "#cbd5e1",
                  lineStyle: "dashed",
                  lineWidth: 1.5,
                },
              });
              lockDrawing(d3);

              // 4. Dedicated Single Entry Price Pin - Locked & unmoveable
              const d4 = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                ],
                text: {
                  value: `${tb.type === "SHORT" ? "▼ SHORT" : "▲ LONG"} $${tb.entryPrice.toFixed(2)}`,
                  color: "#ffffff",
                  size: "small",
                  hAlign: "left",
                  vAlign: "center",
                },
              });
              lockDrawing(d4);

              // 5. Dedicated Single Stop Loss Pin - Locked & unmoveable
              const d5 = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.entryTime, price: tb.slPrice },
                ],
                text: {
                  value: `SL: $${tb.slPrice.toFixed(2)} (-$${riskAmount})`,
                  color: "#f87171",
                  size: "small",
                  hAlign: "left",
                  vAlign: "center",
                },
              });
              lockDrawing(d5);

              // 6. Dedicated Single Take Profit Pin - Locked & unmoveable
              const d6 = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.entryTime, price: tb.tpPrice },
                ],
                text: {
                  value: `TP: $${tb.tpPrice.toFixed(2)} (+$${rewardAmount})`,
                  color: "#34d399",
                  size: "small",
                  hAlign: "left",
                  vAlign: "center",
                },
              });
              lockDrawing(d6);

              // 7. Dedicated Trade Exit Outcome Pin - Shows TP HIT / SL HIT with exact price & outcome
              const isWin = tb.isWin ?? (tb.profitUsd > 0);
              const cleanBadge = (tb.exitBadge || "").replace(/\n/g, " ");
              const exitText = cleanBadge || (isWin ? `🏆 TP HIT +$${rewardAmount}` : `❌ SL HIT -$${riskAmount}`);
              const exitColor = isWin ? "#34d399" : "#f87171";

              const d7 = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.exitTime, price: tb.exitPrice },
                ],
                text: {
                  value: `${exitText} @ $${tb.exitPrice.toFixed(2)}`,
                  color: exitColor,
                  size: "small",
                  hAlign: "left",
                  vAlign: "center",
                },
              });
              lockDrawing(d7);
            } catch (drawingErr) {
              console.warn("[StrategyChart] Error plotting trade setup:", drawingErr);
            }
          }
        }
      } catch (err: any) {
        console.error("[StrategyChart] Data load error:", err);
        setError(err?.message || "Failed to load market data");
        setStatus("ERROR");
      } finally {
        setLoading(false);
      }
    }

    loadAndMount();

    return () => {
      disposed = true;
    };
  }, [strategyId, timeframe]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (workspaceRef.current) {
        try {
          workspaceRef.current.destroy();
        } catch (_) {}
        workspaceRef.current = null;
      }
    };
  }, []);

  const handleTimeframeChange = (newTf: string) => {
    setTimeframe(newTf);
  };

  const handleRetry = () => {
    mountedKeyRef.current = "";
    setTimeframe((tf) => tf);
  };

  return (
    <div className="chart-layout-root">
      {/* Trading Terminal Topbar */}
      <ChartToolbar
        strategyId={contract?.strategyId || strategyId}
        strategyName={contract?.name || "Pine Script Strategy"}
        symbol={contract?.symbol || "XAUUSD"}
        timeframe={timeframe === "15" ? "M15" : timeframe === "5" ? "M5" : timeframe}
        candleCount={candles.length || 5000}
        status={status}
        onTimeframeChange={handleTimeframeChange}
        onTogglePanel={() => setPanelOpen((prev) => !prev)}
        panelOpen={panelOpen}
        showBoxes={showBoxes}
        onToggleBoxes={() => setShowBoxes((prev) => !prev)}
        alertEnabled={alertEnabled}
        onToggleAlert={handleToggleAlert}
        trialStatus={trialStatus}
        daysLeft={daysLeft}
      />

      <div className="chart-main-body">
        {/* Main Chart Stage */}
        <div className="chart-canvas-wrapper" style={{ position: "relative" }}>

          {trialStatus === "EXPIRED" && !hasPaid && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 100,
                background: "rgba(5, 8, 17, 0.88)",
                backdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                7-Day Free Trial Concluded
              </h2>
              <p style={{ maxWidth: 480, color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                Your 7-day evaluation period for <b>{contract?.name || strategyId}</b> has ended. Upgrade to StratMarket Pro to unlock continuous 24/7 autonomous VPS signals, candlestick streaming, and execution overlays.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <Link href="/pricing" className="pill action-btn" style={{ fontSize: 14, padding: "12px 28px", textDecoration: "none" }}>
                  Upgrade to StratMarket Pro →
                </Link>
                <Link href="/dashboard" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none" }}>
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {loading && (
            <div className="chart-loading-overlay">
              <div className="chart-spinner" />
              <p>Streaming authoritative TradingView market data for {strategyId}...</p>
            </div>
          )}

          {error && (
            <div className="chart-error-banner">
              <p>⚠️ {error}</p>
              <button className="chart-retry-btn" onClick={handleRetry}>
                Retry Connection
              </button>
            </div>
          )}

          <div
            id="vela-container"
            ref={containerRef}
            className="vela-container"
            style={{ width: "100%", height: "100%", position: "relative" }}
          />
        </div>

        {/* Collapsible Strategy Panel */}
        <StrategyStatusPanel
          contract={contract}
          onClose={() => setPanelOpen(false)}
          isOpen={panelOpen}
          candleCount={candles.length}
          storedSignals={storedSignals}
        />
      </div>
    </div>
  );
}
