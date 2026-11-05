"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  initialUser?: { id: string; name: string; email: string };
  initialHasAccess?: boolean;
  initialTrialStatus?: string;
  initialDaysLeft?: number;
  initialHasPaid?: boolean;
}

export function StrategyChart({
  strategyId,
  initialUser,
  initialHasAccess = false,
  initialTrialStatus = "NOT_STARTED",
  initialDaysLeft = 0,
  initialHasPaid = false,
}: Props) {
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

  // Entitlement & Trial states
  const [trialStatus, setTrialStatus] = useState<string>(initialTrialStatus);
  const [daysLeft, setDaysLeft] = useState<number>(initialDaysLeft);
  const [hasPaid, setHasPaid] = useState<boolean>(initialHasPaid);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [paywallType, setPaywallType] = useState<"NONE" | "SIGNIN" | "TRIAL_REQUIRED" | "EXPIRED">(
    initialTrialStatus === "EXPIRED" && !initialHasPaid
      ? "EXPIRED"
      : initialTrialStatus === "NOT_STARTED" && !initialHasPaid && !initialHasAccess
      ? "TRIAL_REQUIRED"
      : "NONE"
  );

  // Load alert and trial status from backend
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
            if (current.hasPaid || current.trialStatus === "ACTIVE") {
              setPaywallType("NONE");
            } else if (current.trialStatus === "EXPIRED") {
              setPaywallType("EXPIRED");
            } else if (current.trialStatus === "NOT_STARTED") {
              setPaywallType("TRIAL_REQUIRED");
            }
          }
        }
      })
      .catch(() => {});
  }, [strategyId]);

  // Activate 7-Day Free Trial instantly from paywall
  const handleStartTrial = async () => {
    setActivatingTrial(true);
    try {
      const res = await fetch(`/api/strategies/${strategyId.toLowerCase()}/trial`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrialStatus("ACTIVE");
        setDaysLeft(7);
        setPaywallType("NONE");
        setAlertEnabled(true);
        // Force workspace reload
        mountedKeyRef.current = "";
        setTimeframe((tf) => tf);
      } else {
        alert(data.error || "Failed to start 7-day trial.");
      }
    } catch {
      alert("Network error activating 7-day trial. Please try again.");
    } finally {
      setActivatingTrial(false);
    }
  };

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
          setPaywallType("NONE");
        }
      } else {
        const data = await res.json();
        if (data.code === "TRIAL_EXPIRED") {
          setPaywallType("EXPIRED");
        }
      }
    } catch (err) {
      console.error("Failed to toggle alert in chart:", err);
    }
  };

  // Mount Vela workspace ONCE per strategy/timeframe
  useEffect(() => {
    let disposed = false;

    async function loadAndMount() {
      const key = `${strategyId}-${timeframe}`;
      if (mountedKeyRef.current === key && workspaceRef.current) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch maximum 5,000 bars and strategy execution contract
        const res = await fetch(`/api/chart/${strategyId}/series?count=5000&timeframe=${timeframe}`);
        
        // Handle 401 Unauthorized
        if (res.status === 401) {
          setPaywallType("SIGNIN");
          setLoading(false);
          return;
        }

        // Handle 403 Forbidden (Trial Required or Trial Expired)
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          if (errData.code === "TRIAL_EXPIRED" || errData.paywallType === "UPGRADE_REQUIRED") {
            setPaywallType("EXPIRED");
            setTrialStatus("EXPIRED");
          } else {
            setPaywallType("TRIAL_REQUIRED");
            setTrialStatus("NOT_STARTED");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load strategy chart series");
        }

        if (disposed) return;

        setContract(data.contract);
        setCandles(data.candles || []);
        setStoredSignals(data.storedSignals || []);
        setStatus("LIVE");
        setPaywallType("NONE");

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
          layout: false,
          theme: "dark",
          symbol: data.contract?.symbol || "XAUUSD",
          timeframe: timeframe,
          live: false,
          volume: false,
          drawingToolbar: true,
          indicatorPicker: false,
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
            } catch (_) {}
          }
        }
      } catch (err: any) {
        console.error("Vela mount error:", err);
        if (!disposed) {
          setError(err.message || "Failed to load TradingView chart series");
          setStatus("ERROR");
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    loadAndMount();

    return () => {
      disposed = true;
      if (workspaceRef.current) {
        try {
          workspaceRef.current.destroy();
        } catch (_) {}
        workspaceRef.current = null;
      }
    };
  }, [strategyId, timeframe]);

  const handleTimeframeChange = (tf: string) => {
    const clean = tf.replace("M", "").toLowerCase();
    setTimeframe(clean);
  };

  const handleRetry = () => {
    mountedKeyRef.current = "";
    setTimeframe((tf) => tf);
  };

  const isLocked = paywallType !== "NONE";

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
          
          {/* PAYWALL 1: Authentication Required */}
          {paywallType === "SIGNIN" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 100,
                background: "rgba(5, 8, 17, 0.94)",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#d4af37",
                  border: "1px solid rgba(212, 175, 55, 0.4)",
                  background: "rgba(212, 175, 55, 0.1)",
                  marginBottom: 12,
                  fontFamily: "'SF Mono', monospace",
                  textTransform: "uppercase",
                }}
              >
                Sign In Required
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                Authentication Required to Stream Live Chart
              </h2>
              <p style={{ maxWidth: 480, color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                Live TradingView tick streaming, Long/Short execution overlays, and 24/7 VPS signals for <b>{contract?.name || strategyId}</b> are available exclusively to authenticated traders with an active 7-Day Free Trial or Pro Membership.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <Link
                  href={`/signin?redirect=/chart/${encodeURIComponent(strategyId)}`}
                  className="pill action-btn"
                  style={{
                    fontSize: 14,
                    padding: "12px 28px",
                    textDecoration: "none",
                    background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
                    color: "#000",
                    fontWeight: 800,
                  }}
                >
                  Sign In / Create Account →
                </Link>
                <Link href="/market" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none" }}>
                  Explore Strategies
                </Link>
              </div>
            </div>
          )}

          {/* PAYWALL 2: 7-Day Free Trial Required (Trial not started yet) */}
          {(paywallType === "TRIAL_REQUIRED" || (trialStatus === "NOT_STARTED" && !hasPaid)) && paywallType !== "SIGNIN" && paywallType !== "EXPIRED" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 100,
                background: "rgba(5, 8, 17, 0.94)",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#d4af37",
                  border: "1px solid rgba(212, 175, 55, 0.4)",
                  background: "rgba(212, 175, 55, 0.1)",
                  marginBottom: 12,
                  fontFamily: "'SF Mono', monospace",
                  textTransform: "uppercase",
                }}
              >
                7-Day Risk-Free Trial
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                Unlock {contract?.name || strategyId} Live Terminal
              </h2>
              <p style={{ maxWidth: 480, color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                Access to private LuxAlgo Vela live market charting, real-time Long/Short trade execution boxes, and 24/7 VPS signal alerts is reserved for active 7-Day Trial and StratMarket Pro members.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={handleStartTrial}
                  disabled={activatingTrial}
                  className="pill action-btn"
                  style={{
                    fontSize: 14,
                    padding: "12px 28px",
                    cursor: activatingTrial ? "wait" : "pointer",
                    background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
                    color: "#000",
                    fontWeight: 800,
                  }}
                >
                  {activatingTrial ? "Activating 7-Day Trial..." : "⚡ Start 7-Day Free Trial (Instant Access)"}
                </button>
                <Link href="/pricing" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none" }}>
                  Upgrade to Pro
                </Link>
                <Link href="/dashboard" className="pill sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none" }}>
                  Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* PAYWALL 3: 7-Day Free Trial Concluded */}
          {(paywallType === "EXPIRED" || (trialStatus === "EXPIRED" && !hasPaid)) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 100,
                background: "rgba(5, 8, 17, 0.94)",
                backdropFilter: "blur(12px)",
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="/pricing" className="pill action-btn" style={{ fontSize: 14, padding: "12px 28px", textDecoration: "none" }}>
                  Upgrade to StratMarket Pro →
                </Link>
                <Link href="/dashboard" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none" }}>
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {loading && !isLocked && (
            <div className="chart-loading-overlay">
              <div className="chart-spinner" />
              <p>Streaming authoritative TradingView market data for {strategyId}...</p>
            </div>
          )}

          {error && !isLocked && (
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
