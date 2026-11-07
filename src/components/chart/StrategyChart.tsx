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
  const [paywallType, setPaywallType] = useState<"NONE" | "SIGNIN" | "TRIAL_REQUIRED" | "EXPIRED">(
    initialTrialStatus === "EXPIRED" && !initialHasPaid
      ? "EXPIRED"
      : (initialTrialStatus === "NOT_STARTED" || !initialTrialStatus) && !initialHasPaid && !initialHasAccess
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
            if (current.expiryTime) {
              setTrialExpiry(current.expiryTime);
            }
            setHasPaid(Boolean(current.hasPaid));
            if (current.hasPaid || current.trialStatus === "ACTIVE" || current.hasAccess) {
              setPaywallType("NONE");
              setTrialStatus("ACTIVE");
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

        // Fetch 1,500 high-fidelity bars and strategy execution contract with defensive 6s abort timeout
        const abortCtrl = new AbortController();
        const abortTimeout = setTimeout(() => abortCtrl.abort(), 6000);

        let res: Response;
        try {
          res = await fetch(`/api/chart/${strategyId}/series?count=1500&timeframe=${timeframe}`, {
            signal: abortCtrl.signal,
          });
        } finally {
          clearTimeout(abortTimeout);
        }
        
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

        // Plot authentic Long/Short Position Tool boxes with clear TP and SL zones across visible trades
        if (showBoxes && data.contract?.tradeBoxes && ws.chart?.drawings) {
          const lockDrawing = (d: any) => {
            if (!d) return;
            try {
              d.locked = true;
              if (d.id) {
                ws.chart?.drawings?.lock(d.id, true);
              }
            } catch (_) {}
          };

          const boxesToPlot = (data.contract.tradeBoxes || []).slice(-25);

          for (const tb of boxesToPlot) {
            try {
              // 1. Reward Zone Box (Take Profit - Vibrant Emerald Green)
              const d1 = ws.chart.drawings.add("box", {
                anchors: [
                  { time: tb.entryTime, price: tb.entryPrice },
                  { time: tb.exitTime, price: tb.tpPrice },
                ],
                style: {
                  fillColor: "rgba(16, 185, 129, 0.22)",
                  lineColor: "#10b981",
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
                  lineColor: "rgba(255, 255, 255, 0.6)",
                  lineStyle: "dashed",
                  lineWidth: 1.5,
                },
              });
              lockDrawing(d3);

              // 4. Single Clean Entry Price Pin
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
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700,
                    border: "none",
                  }}
                >
                  Sign In / Create Account →
                </Link>
                <Link href="/market" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }}>
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
                7-Day Risk-Free Trial
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                Unlock {contract?.name || strategyId} Live Terminal
              </h2>
              <p style={{ maxWidth: 480, color: "#a1a1aa", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
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
                    background: "#ffffff",
                    color: "#000000",
                    fontWeight: 700,
                    border: "none",
                  }}
                >
                  {activatingTrial ? "Activating 7-Day Trial..." : "Start 7-Day Free Trial (Instant Access)"}
                </button>
                <Link href="/pricing" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }}>
                  Upgrade to Pro
                </Link>
                <Link href="/dashboard" className="pill sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }}>
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
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                7-Day Free Trial Concluded
              </h2>
              <p style={{ maxWidth: 480, color: "#a1a1aa", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                Your 7-day evaluation period for <b>{contract?.name || strategyId}</b> has ended. Upgrade to StratMarket Pro to unlock continuous 24/7 autonomous VPS signals, candlestick streaming, and execution overlays.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="/pricing" className="pill action-btn" style={{ fontSize: 14, padding: "12px 28px", textDecoration: "none", background: "#ffffff", color: "#000000", fontWeight: 700, border: "none" }}>
                  Upgrade to StratMarket Pro →
                </Link>
                <Link href="/dashboard" className="pill g sm" style={{ fontSize: 14, padding: "12px 20px", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }}>
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
              <p>{error}</p>
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
