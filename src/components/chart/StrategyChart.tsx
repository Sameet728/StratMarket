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
  initialTrialExpiry?: string | null;
}

export function StrategyChart({
  strategyId,
  initialUser,
  initialHasAccess = false,
  initialTrialStatus = "NOT_STARTED",
  initialDaysLeft = 0,
  initialHasPaid = false,
  initialTrialExpiry = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const mountedKeyRef = useRef<string>("");
  const tradeBoxDrawingIdsRef = useRef<string[]>([]);

  const [contract, setContract] = useState<StrategyChartContract | null>(null);
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [storedSignals, setStoredSignals] = useState<StoredSignal[]>([]);
  const [timeframe, setTimeframe] = useState<string>("15");
  const [status, setStatus] = useState<"LIVE" | "HISTORICAL" | "CONNECTING" | "ERROR">("CONNECTING");
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [loading, setLoading] = useState(true);

  // Entitlement & Trial states
  const [trialStatus, setTrialStatus] = useState<string>(initialTrialStatus);
  const [daysLeft, setDaysLeft] = useState<number>(initialDaysLeft);
  const [trialExpiry, setTrialExpiry] = useState<string | null>(initialTrialExpiry);
  const [hasPaid, setHasPaid] = useState<boolean>(initialHasPaid);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [paywallType, setPaywallType] = useState<"NONE" | "SIGNIN">(
    !initialUser ? "SIGNIN" : "NONE"
  );

  // Load alert status from backend
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
      const isTrialAccepted =
        (res.ok && data.success) ||
        Boolean(data.alreadyActive) ||
        data.code === "TRIAL_ALREADY_USED" ||
        data.error?.toLowerCase().includes("already used");

      if (isTrialAccepted) {
        setTrialStatus("ACTIVE");
        setDaysLeft(data.trial?.daysRemaining || 7);
        if (data.trial?.expiryTime) {
          setTrialExpiry(data.trial.expiryTime);
        }
        setPaywallType("NONE");
        setAlertEnabled(true);
        // Force workspace reload
        mountedKeyRef.current = "";
        setTimeframe((tf) => tf);
      } else {
        if (
          res.status === 401 ||
          data.code === "USER_NOT_FOUND" ||
          data.error?.includes("USER_NOT_FOUND") ||
          data.error?.toLowerCase().includes("authentication required") ||
          data.error?.toLowerCase().includes("user not found")
        ) {
          window.location.href = `/signin?redirect=/chart/${encodeURIComponent(strategyId)}`;
          return;
        }
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
      }
    } catch (err) {
      console.error("Failed to toggle alert in chart:", err);
    }
  };

  // Mount Vela workspace ONCE per strategy/timeframe
  useEffect(() => {
    let disposed = false;
    const abortCtrl = new AbortController();

    async function loadAndMount() {
      const key = `${strategyId}-${timeframe}`;
      if (mountedKeyRef.current === key && workspaceRef.current) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch 1,500 high-fidelity bars and strategy execution contract
        const res = await fetch(`/api/chart/${strategyId}/series?count=1500&timeframe=${timeframe}`, {
          signal: abortCtrl.signal,
        });
        
        // Handle 401 Unauthorized
        if (res.status === 401) {
          setPaywallType("SIGNIN");
          setLoading(false);
          return;
        }

        // Handle 401 Unauthorized or 403 Forbidden
        if (res.status === 401 || res.status === 403) {
          setPaywallType("SIGNIN");
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

        // Initialize pure candlestick chart: clean, uncluttered, fixed 15m with drawing toolbar
        const ws = new VelaWorkspace(containerRef.current, {
          layout: false,
          theme: "dark",
          symbol: data.contract?.symbol || "XAUUSD",
          timeframe: "15",
          live: false,
          volume: false,
          drawingToolbar: true,
          indicatorPicker: false,
          cells: {
            c1: {
              symbol: data.contract?.symbol || "XAUUSD",
              timeframe: "15",
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

        // Single clean removal pass (CSS handles continuous hiding without DOM observation)
        const marks = containerRef.current?.querySelectorAll(
          'a.vela-attribution, .vela-attribution, [class*="vela-attr"], a[href*="velacharts"], .vela-watermark'
        );
        marks?.forEach((el) => el.remove());

        // Plot authentic Long/Short Position Tool boxes with explicit Entry, TP, and SL price labels
        tradeBoxDrawingIdsRef.current = [];

        const lockDrawing = (d: any) => {
          if (!d) return;
          try {
            d.locked = true;
            if (d.id) {
              tradeBoxDrawingIdsRef.current.push(d.id);
              ws.chart?.drawings?.lock(d.id, true);
              if (!showBoxes) {
                ws.chart?.drawings?.update(d.id, { visible: false });
              }
            }
          } catch (_) {}
        };

        if (data.contract?.tradeBoxes && ws.chart?.drawings) {
          const boxesToPlot = (data.contract.tradeBoxes || []).slice(-25);

          for (const tb of boxesToPlot) {
            try {
              const rMultiple = ((Math.abs(tb.tpPrice - tb.entryPrice)) / (Math.abs(tb.slPrice - tb.entryPrice))).toFixed(2);
              const tpPts = Math.abs(tb.tpPrice - tb.entryPrice).toFixed(1);
              const slPts = Math.abs(tb.slPrice - tb.entryPrice).toFixed(1);

              // 1. Reward Zone Box (Take Profit - Electric Cyber Lime)
              const d1 = ws.chart.drawings.add("box", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.tpPrice },
                ],
                style: {
                  fillColor: "rgba(163, 230, 53, 0.18)",
                  lineColor: "#a3e635",
                  lineWidth: 1.5,
                  lineStyle: "solid",
                },
              });
              lockDrawing(d1);

              // 2. Risk Zone Box (Stop Loss - Vibrant Crimson Red)
              const d2 = ws.chart.drawings.add("box", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.slPrice },
                ],
                style: {
                  fillColor: "rgba(239, 68, 68, 0.22)",
                  lineColor: "#ef4444",
                  lineWidth: 1.5,
                  lineStyle: "solid",
                },
              });
              lockDrawing(d2);

              // 3. Center Entry Price Line (Crisp White Dashed)
              const d3 = ws.chart.drawings.add("trendline", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.entryPrice },
                ],
                style: {
                  lineColor: "rgba(255, 255, 255, 0.7)",
                  lineStyle: "dashed",
                  lineWidth: 1.5,
                },
              });
              lockDrawing(d3);

              // 4. Take Profit (TP) Explicit Price Pin (Electric Cyber Lime)
              const tpLabel = tb.id === "tb-active"
                ? `TP: $${tb.tpPrice.toFixed(2)} (+${tpPts})`
                : tb.isWin
                ? `TP: $${tb.tpPrice.toFixed(2)} · ✓ HIT (+${rMultiple}R)`
                : `TP: $${tb.tpPrice.toFixed(2)}`;

              const dTP = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.entryTime, price: tb.tpPrice },
                ],
                text: {
                  value: tpLabel,
                  color: "#a3e635",
                  size: "small",
                  hAlign: "left",
                  vAlign: tb.type === "LONG" ? "bottom" : "top",
                  bold: true,
                },
              });
              lockDrawing(dTP);

              // 5. Entry Explicit Price Pin (Crisp White)
              const entryLabel = tb.id === "tb-active"
                ? `${tb.type === "SHORT" ? "▼ SHORT" : "▲ LONG"} $${tb.entryPrice.toFixed(2)} · LIVE`
                : `${tb.type === "SHORT" ? "▼ SHORT" : "▲ LONG"} $${tb.entryPrice.toFixed(2)}`;

              const dEntry = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                ],
                text: {
                  value: entryLabel,
                  color: "#ffffff",
                  size: "small",
                  hAlign: "left",
                  vAlign: "center",
                  bold: true,
                },
              });
              lockDrawing(dEntry);

              // 6. Stop Loss (SL) Explicit Price Pin (Crimson)
              const slLabel = tb.id === "tb-active"
                ? `SL: $${tb.slPrice.toFixed(2)} (-${slPts})`
                : !tb.isWin
                ? `SL: $${tb.slPrice.toFixed(2)} · ✕ HIT (-1.0R)`
                : `SL: $${tb.slPrice.toFixed(2)}`;

              const dSL = ws.chart.drawings.add("text", {
                anchors: [
                  { time: tb.entryTime, price: tb.slPrice },
                ],
                text: {
                  value: slLabel,
                  color: "#ef4444",
                  size: "small",
                  hAlign: "left",
                  vAlign: tb.type === "LONG" ? "top" : "bottom",
                  bold: true,
                },
              });
              lockDrawing(dSL);
            } catch (_) {}
          }
        }

        // 8. Plot Live Trade Price Levels ONLY when a trade is actively open
        if (data.contract?.priceLevels && ws.chart?.drawings && (data.candles || []).length > 0) {
          const candles = data.candles;
          const lastCandle = candles[candles.length - 1];
          const futureTime = lastCandle.time + 15 * 60 * 1000 * 8; // 8 bars forward

          // Only plot active execution brackets when a live trade is actually running
          const activeTradeLevels = data.contract.priceLevels.filter(
            (lvl: any) => Boolean(lvl.isActiveTrade) || lvl.name.toLowerCase().startsWith("active ")
          );

          for (const lvl of activeTradeLevels) {
            try {
              const isTP = lvl.name.toLowerCase().includes("take profit") || lvl.name.toLowerCase().includes("tp");
              const isSL = lvl.name.toLowerCase().includes("stop loss") || lvl.name.toLowerCase().includes("sl");
              const isEntry = lvl.name.toLowerCase().includes("entry");
              const color = isTP ? "#a3e635" : isSL ? "#ef4444" : isEntry ? "#ffffff" : "#a1a1aa";
              const labelPrefix = isTP ? "Active TP" : isSL ? "Active SL" : isEntry ? "Active Entry" : "Market";

              const line = ws.chart.drawings.add("trendline", {
                anchors: [
                  { time: lastCandle.time, price: lvl.price },
                  { time: futureTime, price: lvl.price },
                ],
                style: {
                  lineColor: color,
                  lineStyle: lvl.style === "solid" ? "solid" : "dashed",
                  lineWidth: 1.5,
                },
              });
              lockDrawing(line);

              const label = ws.chart.drawings.add("text", {
                anchors: [
                  { time: futureTime, price: lvl.price },
                ],
                text: {
                  value: `${labelPrefix}: $${lvl.price.toFixed(2)}`,
                  color: color,
                  size: "small",
                  hAlign: "left",
                  vAlign: "center",
                  bold: true,
                },
              });
              lockDrawing(label);
            } catch (_) {}
          }
        }
      } catch (err: any) {
        if (disposed || err.name === "AbortError" || abortCtrl.signal.aborted) {
          return;
        }
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
      abortCtrl.abort();
      mountedKeyRef.current = "";
      if (workspaceRef.current) {
        try {
          workspaceRef.current.destroy();
        } catch (_) {}
        workspaceRef.current = null;
      }
    };
  }, [strategyId, timeframe]);

  // Handle tab switching & browser back/forward cache restoration (bfcache)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        // Tab was switched back - force canvas resize and drawings refresh without freezing
        try {
          if (workspaceRef.current) {
            workspaceRef.current.chart?.resize?.();
            workspaceRef.current.resize?.();
            const drawingsCtrl = workspaceRef.current.chart?.drawings;
            if (drawingsCtrl && tradeBoxDrawingIdsRef.current.length > 0) {
              for (const id of tradeBoxDrawingIdsRef.current) {
                drawingsCtrl.update(id, { visible: showBoxes });
              }
            }
          }
        } catch (_) {}
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      // Restored from browser back/forward history cache
      try {
        if (workspaceRef.current) {
          workspaceRef.current.chart?.resize?.();
          workspaceRef.current.resize?.();
        }
      } catch (_) {}
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [showBoxes]);

  // Toggle trade box drawings visibility whenever user clicks "Position Boxes" in the topbar
  useEffect(() => {
    if (!workspaceRef.current?.chart?.drawings) return;
    const drawingsCtrl = workspaceRef.current.chart.drawings;
    for (const id of tradeBoxDrawingIdsRef.current) {
      try {
        drawingsCtrl.update(id, { visible: showBoxes });
      } catch (_) {}
    }
  }, [showBoxes]);

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
        timeframe="15m"
        candleCount={candles.length || 1500}
        status={status}
        onTogglePanel={() => setPanelOpen((prev) => !prev)}
        panelOpen={panelOpen}
        showBoxes={showBoxes}
        onToggleBoxes={() => setShowBoxes((prev) => !prev)}
        alertEnabled={alertEnabled}
        onToggleAlert={handleToggleAlert}
        trialStatus={trialStatus}
        daysLeft={daysLeft}
        trialExpiry={trialExpiry}
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
                background: "rgba(0, 0, 0, 0.88)",
                backdropFilter: "blur(24px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.08)",
                  marginBottom: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                }}
              >
                Sign In Required
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                Authentication Required to Stream Live Chart
              </h2>
              <p style={{ maxWidth: 480, color: "#a1a1aa", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                Live TradingView tick streaming, Long/Short execution overlays, and 24/7 VPS signals for <b>{contract?.name || strategyId}</b> are available to registered traders. Sign in or create a free account to unlock instant access.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <Link
                  href={`/signin?redirect=/chart/${encodeURIComponent(strategyId)}`}
                  className="pill action-btn"
                  style={{
                    fontSize: 14,
                    padding: "12px 28px",
                    textDecoration: "none",
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700,
                    border: "none",
                  }}
                >
                  Sign In / Create Free Account →
                </Link>
                <Link href="/market" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }}>
                  Explore Strategies
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
              <p>{error}</p>
              <button type="button" className="chart-retry-btn" onClick={handleRetry} style={{ touchAction: "manipulation" }}>
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
