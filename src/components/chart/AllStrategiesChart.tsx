"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { StratMarketLogo } from "@/components/StratMarketLogo";
import { MarketCandle } from "@/lib/market-data";
import { toast } from "@/components/ui/Toast";
import {
  getBrowserAlertPreference,
  setBrowserAlertPreference,
  requestBrowserNotificationPermission,
} from "@/lib/notifications/browser-notifications";

// ── Strategy Color Palette ──────────────────────────────────────────────────
const STRATEGY_PALETTE: Record<
  string,
  {
    name: string;
    shortName: string;
    tpFill: string;
    tpBorder: string;
    slFill: string;
    slBorder: string;
    entryLine: string;
    tpText: string;
    slText: string;
    entryText: string;
    dot: string;
  }
> = {
  "PS-01": {
    name: "Grandmaster Dual 10R / 8R",
    shortName: "PS-01",
    tpFill: "rgba(14, 165, 233, 0.16)",   // sky blue
    tpBorder: "#0ea5e9",
    slFill: "rgba(239, 68, 68, 0.18)",
    slBorder: "#ef4444",
    entryLine: "rgba(14, 165, 233, 0.75)",
    tpText: "#38bdf8",
    slText: "#ef4444",
    entryText: "#7dd3fc",
    dot: "#0ea5e9",
  },
  "PS-02": {
    name: "US Afternoon Reversal",
    shortName: "PS-02",
    tpFill: "rgba(251, 146, 60, 0.16)",   // amber orange
    tpBorder: "#fb923c",
    slFill: "rgba(239, 68, 68, 0.18)",
    slBorder: "#ef4444",
    entryLine: "rgba(251, 146, 60, 0.75)",
    tpText: "#fdba74",
    slText: "#ef4444",
    entryText: "#fed7aa",
    dot: "#fb923c",
  },
  "PS-03": {
    name: "London Core Expansion",
    shortName: "PS-03",
    tpFill: "rgba(163, 230, 53, 0.14)",   // lime green
    tpBorder: "#a3e635",
    slFill: "rgba(239, 68, 68, 0.18)",
    slBorder: "#ef4444",
    entryLine: "rgba(163, 230, 53, 0.75)",
    tpText: "#a3e635",
    slText: "#ef4444",
    entryText: "#bef264",
    dot: "#a3e635",
  },
};

const STRATEGIES = ["PS-01", "PS-02", "PS-03"] as const;

interface TradeBox {
  id: string;
  type: "LONG" | "SHORT";
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  isWin?: boolean;
  strategyId: string;
}

interface StrategyData {
  strategyId: string;
  candles: MarketCandle[];
  tradeBoxes: TradeBox[];
  loaded: boolean;
  error: boolean;
}

interface Props {
  initialUser: { id: string; name: string; email: string };
}

// ── Hover Tooltip (pure HTML overlay over Vela canvas) ───────────────────────
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  strategyId: string;
  tradeType: string;
  direction: string;
  entry: number;
  tp: number;
  sl: number;
  isWin?: boolean;
}

export function AllStrategiesChart({ initialUser }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const mountedRef = useRef(false);
  const candlesRef = useRef<MarketCandle[]>([]);
  const drawingIdsRef = useRef<string[]>([]);
  const allTradeBoxesRef = useRef<Array<TradeBox & { drawingIds: string[] }>>([]);

  const [status, setStatus] = useState<"LIVE" | "HISTORICAL" | "CONNECTING" | "ERROR">("CONNECTING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [strategyData, setStrategyData] = useState<Record<string, StrategyData>>({});
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(STRATEGIES));
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, strategyId: "", tradeType: "", direction: "", entry: 0, tp: 0, sl: 0 });
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [browserAlerts, setBrowserAlerts] = useState(false);

  useEffect(() => {
    setBrowserAlerts(getBrowserAlertPreference());
  }, []);

  const handleToggleBrowserAlerts = async () => {
    if (!browserAlerts) {
      const granted = await requestBrowserNotificationPermission();
      if (granted) {
        setBrowserAlerts(true);
        toast.success("Browser Push Alerts Active", "Desktop notifications enabled for all strategies.");
      }
    } else {
      setBrowserAlertPreference(false);
      setBrowserAlerts(false);
    }
  };

  // ── Fetch data for all 3 strategies in parallel ───────────────────────────
  const fetchAllStrategies = useCallback(async (signal?: AbortSignal) => {
    const results = await Promise.allSettled(
      STRATEGIES.map((id) =>
        fetch(`/api/chart/${id}/series?count=1500&timeframe=15`, { signal }).then((r) => r.json())
      )
    );

    const dataMap: Record<string, StrategyData> = {};
    let masterCandles: MarketCandle[] = [];

    results.forEach((result, idx) => {
      const stratId = STRATEGIES[idx];
      if (result.status === "fulfilled" && result.value.success) {
        const d = result.value;
        const boxes: TradeBox[] = (d.contract?.tradeBoxes || []).map((b: any) => ({
          ...b,
          strategyId: stratId,
        }));
        dataMap[stratId] = {
          strategyId: stratId,
          candles: d.candles || [],
          tradeBoxes: boxes,
          loaded: true,
          error: false,
        };
        // Use longest candle series as master candles for the chart
        if ((d.candles || []).length > masterCandles.length) {
          masterCandles = d.candles || [];
        }
      } else {
        dataMap[stratId] = {
          strategyId: stratId,
          candles: [],
          tradeBoxes: [],
          loaded: false,
          error: true,
        };
      }
    });

    return { dataMap, masterCandles };
  }, []);

  // ── Draw all trade boxes for active strategies ────────────────────────────
  const drawAllTradeBoxes = useCallback(
    (ws: any, dataMap: Record<string, StrategyData>, filters: Set<string>) => {
      if (!ws?.chart?.drawings) return;
      const drawings = ws.chart.drawings;
      drawingIdsRef.current = [];
      allTradeBoxesRef.current = [];

      for (const stratId of STRATEGIES) {
        if (!filters.has(stratId)) continue;
        const data = dataMap[stratId];
        if (!data?.tradeBoxes?.length) continue;

        const palette = STRATEGY_PALETTE[stratId];
        const rawBoxes = data.tradeBoxes;

        // Dedup by entryTime
        const seen = new Set<number>();
        const unique: TradeBox[] = [];
        for (let i = rawBoxes.length - 1; i >= 0; i--) {
          if (!seen.has(rawBoxes[i].entryTime)) {
            seen.add(rawBoxes[i].entryTime);
            unique.unshift(rawBoxes[i]);
          }
        }
        const boxes = unique.slice(-20); // last 20 per strategy

        for (const tb of boxes) {
          const dIds: string[] = [];
          try {
            const rMult = (Math.abs(tb.tpPrice - tb.entryPrice) / Math.abs(tb.slPrice - tb.entryPrice)).toFixed(2);
            const isActive = tb.id === "tb-active";

            // TP reward zone
            const d1 = drawings.add("box", {
              anchors: [
                { time: tb.entryTime, price: tb.entryPrice },
                { time: tb.exitTime, price: tb.tpPrice },
              ],
              style: { fillColor: palette.tpFill, lineColor: palette.tpBorder, lineWidth: 1.5, lineStyle: "solid" },
            });
            if (d1?.id) { drawingIdsRef.current.push(d1.id); dIds.push(d1.id); drawings.lock(d1.id, true); }

            // SL risk zone
            const d2 = drawings.add("box", {
              anchors: [
                { time: tb.entryTime, price: tb.entryPrice },
                { time: tb.exitTime, price: tb.slPrice },
              ],
              style: { fillColor: palette.slFill, lineColor: palette.slBorder, lineWidth: 1, lineStyle: "solid" },
            });
            if (d2?.id) { drawingIdsRef.current.push(d2.id); dIds.push(d2.id); drawings.lock(d2.id, true); }

            // Entry line
            const d3 = drawings.add("trendline", {
              anchors: [
                { time: tb.entryTime, price: tb.entryPrice },
                { time: tb.exitTime, price: tb.entryPrice },
              ],
              style: { lineColor: palette.entryLine, lineStyle: "dashed", lineWidth: 1.5 },
            });
            if (d3?.id) { drawingIdsRef.current.push(d3.id); dIds.push(d3.id); drawings.lock(d3.id, true); }

            // TP label
            const tpLabel = isActive
              ? `TP: $${tb.tpPrice.toFixed(2)} [${palette.shortName}]`
              : tb.isWin
              ? `TP: $${tb.tpPrice.toFixed(2)} ✓ (+${rMult}R) [${palette.shortName}]`
              : `TP: $${tb.tpPrice.toFixed(2)} [${palette.shortName}]`;

            const dTP = drawings.add("text", {
              anchors: [{ time: tb.entryTime, price: tb.tpPrice }],
              text: { value: tpLabel, color: palette.tpText, size: "small", hAlign: "left", vAlign: tb.type === "LONG" ? "bottom" : "top", bold: true },
            });
            if (dTP?.id) { drawingIdsRef.current.push(dTP.id); dIds.push(dTP.id); drawings.lock(dTP.id, true); }

            // Entry label
            const entryLabel = isActive
              ? `${tb.type === "SHORT" ? "▼ SHORT" : "▲ LONG"} $${tb.entryPrice.toFixed(2)} · ${palette.shortName} LIVE`
              : `${tb.type === "SHORT" ? "▼" : "▲"} $${tb.entryPrice.toFixed(2)} [${palette.shortName}]`;

            const dEntry = drawings.add("text", {
              anchors: [{ time: tb.entryTime, price: tb.entryPrice }],
              text: { value: entryLabel, color: palette.entryText, size: "small", hAlign: "left", vAlign: "center", bold: true },
            });
            if (dEntry?.id) { drawingIdsRef.current.push(dEntry.id); dIds.push(dEntry.id); drawings.lock(dEntry.id, true); }

            // SL label
            const slLabel = isActive
              ? `SL: $${tb.slPrice.toFixed(2)} [${palette.shortName}]`
              : !tb.isWin
              ? `SL: $${tb.slPrice.toFixed(2)} ✕ (-1R) [${palette.shortName}]`
              : `SL: $${tb.slPrice.toFixed(2)} [${palette.shortName}]`;

            const dSL = drawings.add("text", {
              anchors: [{ time: tb.entryTime, price: tb.slPrice }],
              text: { value: slLabel, color: palette.slText, size: "small", hAlign: "left", vAlign: tb.type === "LONG" ? "top" : "bottom", bold: true },
            });
            if (dSL?.id) { drawingIdsRef.current.push(dSL.id); dIds.push(dSL.id); drawings.lock(dSL.id, true); }

            allTradeBoxesRef.current.push({ ...tb, drawingIds: dIds });
          } catch (_) {}
        }
      }
    },
    []
  );

  // ── Clear all drawings ────────────────────────────────────────────────────
  const clearAllDrawings = useCallback((ws: any) => {
    if (!ws?.chart?.drawings) return;
    for (const id of drawingIdsRef.current) {
      try { ws.chart.drawings.remove(id); } catch (_) {}
    }
    drawingIdsRef.current = [];
    allTradeBoxesRef.current = [];
  }, []);

  // ── Mount Vela + load all data ────────────────────────────────────────────
  useEffect(() => {
    if (mountedRef.current) return;
    let disposed = false;
    const ctrl = new AbortController();

    async function init() {
      try {
        setLoading(true);
        const { dataMap, masterCandles } = await fetchAllStrategies(ctrl.signal);
        if (disposed) return;

        setStrategyData(dataMap);
        candlesRef.current = masterCandles;

        const { VelaWorkspace } = await import("@luxalgo/vela/workspace");
        if (disposed || !containerRef.current) return;

        const isMobile = window.innerWidth < 768;

        const ws = new VelaWorkspace(containerRef.current, {
          layout: false,
          theme: "dark",
          symbol: "XAUUSD",
          timeframe: "15",
          live: false,
          volume: false,
          drawingToolbar: !isMobile,
          indicatorPicker: false,
          cells: {
            c1: { symbol: "XAUUSD", timeframe: "15", data: masterCandles },
          },
        });

        workspaceRef.current = ws;
        mountedRef.current = true;

        try { ws.setTimezone("Asia/Kolkata"); } catch (_) {}
        try { ws.chart?.renderer?.set("attribution", false); } catch (_) {}

        // Remove Vela watermark
        containerRef.current?.querySelectorAll('a.vela-attribution, .vela-attribution, a[href*="velacharts"]')
          .forEach((el) => el.remove());

        // Draw all trade boxes
        drawAllTradeBoxes(ws, dataMap, new Set(STRATEGIES));

        setStatus("LIVE");
        setLoading(false);
        setError(null);
      } catch (err: any) {
        if (disposed || err.name === "AbortError") return;
        setError(err.message || "Failed to load chart");
        setStatus("ERROR");
        setLoading(false);
      }
    }

    init();
    return () => {
      disposed = true;
      ctrl.abort();
      mountedRef.current = false;
      if (workspaceRef.current) {
        try { workspaceRef.current.destroy(); } catch (_) {}
        workspaceRef.current = null;
      }
    };
  }, [fetchAllStrategies, drawAllTradeBoxes]);

  // ── Live price polling ────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/chart/PS-01/series?count=2&timeframe=15", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (d.candles?.length > 0) {
          const last = d.candles[d.candles.length - 1];
          setLivePrice(last.close);

          if (workspaceRef.current) {
            const ws = workspaceRef.current;
            const orch = ws.chart?.orchestrator || ws.orchestrator;
            if (orch?.applyBar) {
              try { orch.applyBar(last); } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // ── Toggle filter per strategy ────────────────────────────────────────────
  const toggleStrategy = useCallback(
    (stratId: string) => {
      setActiveFilters((prev) => {
        const next = new Set(prev);
        if (next.has(stratId)) {
          next.delete(stratId);
        } else {
          next.add(stratId);
        }

        // Redraw with new filters
        if (workspaceRef.current) {
          clearAllDrawings(workspaceRef.current);
          drawAllTradeBoxes(workspaceRef.current, strategyData, next);
        }
        return next;
      });
    },
    [strategyData, clearAllDrawings, drawAllTradeBoxes]
  );

  // ── Toggle all boxes visibility ───────────────────────────────────────────
  const toggleBoxes = () => {
    const next = !showBoxes;
    setShowBoxes(next);
    if (workspaceRef.current?.chart?.drawings) {
      for (const id of drawingIdsRef.current) {
        try { workspaceRef.current.chart.drawings.update(id, { visible: next }); } catch (_) {}
      }
    }
  };

  const totalTrades = Object.values(strategyData).reduce(
    (s, d) => s + (d.tradeBoxes?.length || 0),
    0
  );

  return (
    <div className="chart-layout-root">
      {/* ── TOP TOOLBAR ─────────────────────────────────────────────────── */}
      <div
        className="chart-toolbar"
        style={{ height: "auto", minHeight: 54, flexWrap: "wrap", gap: 6, padding: "0 12px" }}
      >
        {/* Left — brand + back */}
        <div className="chart-toolbar-left" style={{ gap: 8 }}>
          <Link href="/dashboard" className="chart-back-btn" aria-label="Dashboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <StratMarketLogo size={22} />
          <div className="chart-brand" style={{ fontSize: 14 }}>STRATMARKET</div>
          <div className="chart-divider" />

          {/* Strategy badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff",
              whiteSpace: "nowrap",
            }}
          >
            ALL STRATEGIES · XAUUSD 15m
          </div>
        </div>

        {/* Center — per-strategy filter pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {STRATEGIES.map((id) => {
            const p = STRATEGY_PALETTE[id];
            const active = activeFilters.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleStrategy(id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 32,
                  padding: "0 10px",
                  border: `1px solid ${active ? p.dot : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 8,
                  background: active ? `${p.dot}22` : "transparent",
                  color: active ? p.dot : "#52525b",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: active ? p.dot : "#52525b",
                    flexShrink: 0,
                  }}
                />
                {id}
              </button>
            );
          })}
        </div>

        {/* Right — controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
          {/* Position Boxes toggle */}
          <button
            onClick={toggleBoxes}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 10px",
              border: `1px solid ${showBoxes ? "#a3e635" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 8,
              background: showBoxes ? "rgba(163,230,53,0.1)" : "transparent",
              color: showBoxes ? "#a3e635" : "#71717a",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Boxes
          </button>

          {/* Live price */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 10px",
              border: "1px solid rgba(163,230,53,0.3)",
              borderRadius: 8,
              background: "rgba(163,230,53,0.08)",
              fontSize: 12,
              fontWeight: 800,
              color: "#a3e635",
              fontFamily: "JetBrains Mono, monospace",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#a3e635",
                animation: "pulse-dot 1.4s infinite",
              }}
            />
            {livePrice ? `$${livePrice.toFixed(2)}` : "XAUUSD"}
          </div>

          {/* Individual chart links */}
          {STRATEGIES.map((id) => (
            <Link
              key={id}
              href={`/chart/${id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 32,
                padding: "0 10px",
                border: `1px solid ${STRATEGY_PALETTE[id].dot}44`,
                borderRadius: 8,
                background: `${STRATEGY_PALETTE[id].dot}11`,
                color: STRATEGY_PALETTE[id].dot,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {id} →
            </Link>
          ))}
        </div>
      </div>

      {/* ── LEGEND BAR ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "6px 16px",
          background: "#0a0a0b",
          borderBottom: "1px solid #1f1f23",
          flexWrap: "wrap",
        }}
      >
        {STRATEGIES.map((id) => {
          const p = STRATEGY_PALETTE[id];
          const d = strategyData[id];
          const count = d?.tradeBoxes?.length || 0;
          const active = activeFilters.has(id);
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: active ? 1 : 0.35,
                fontSize: 11,
                color: "#a1a1aa",
              }}
            >
              {/* Color swatch */}
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <div style={{ width: 20, height: 10, background: p.tpFill, border: `1px solid ${p.tpBorder}`, borderRadius: 2 }} />
                <div style={{ width: 20, height: 10, background: p.slFill, border: `1px solid ${p.slBorder}`, borderRadius: 2 }} />
              </div>
              <span style={{ fontWeight: 700, color: p.dot }}>{id}</span>
              <span style={{ color: "#52525b" }}>·</span>
              <span>{p.name}</span>
              <span
                style={{
                  background: `${p.dot}22`,
                  color: p.dot,
                  border: `1px solid ${p.dot}44`,
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {count} trades
              </span>
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#52525b" }}>
          XAUUSD · 15m · IST · Hover boxes for strategy info
        </div>
      </div>

      {/* ── CHART BODY ─────────────────────────────────────────────────────── */}
      <div className="chart-main-body">
        <div className="chart-canvas-wrapper" style={{ position: "relative" }}>
          {/* Loading spinner */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                background: "#000",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <div className="chart-spinner" />
              <div style={{ color: "#52525b", fontSize: 13 }}>
                Loading all strategies chart…
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {STRATEGIES.map((id) => (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: STRATEGY_PALETTE[id].dot,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: STRATEGY_PALETTE[id].dot,
                        animation: "pulse-dot 1.4s infinite",
                      }}
                    />
                    {id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                background: "#000",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div style={{ color: "#ef4444", fontSize: 14 }}>Chart load error: {error}</div>
              <button
                onClick={() => { mountedRef.current = false; window.location.reload(); }}
                style={{
                  padding: "8px 20px",
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  color: "#fff",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Vela canvas */}
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

          {/* ── Hover Tooltip ─────────────────────────────────────────────── */}
          {tooltip.visible && (
            <div
              style={{
                position: "absolute",
                left: tooltip.x + 14,
                top: tooltip.y - 10,
                zIndex: 200,
                background: "rgba(9,9,11,0.97)",
                border: `1px solid ${STRATEGY_PALETTE[tooltip.strategyId]?.dot || "#3f3f46"}`,
                borderRadius: 10,
                padding: "10px 14px",
                pointerEvents: "none",
                minWidth: 180,
                boxShadow: `0 4px 24px -4px ${STRATEGY_PALETTE[tooltip.strategyId]?.dot || "#000"}44`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 8,
                  fontWeight: 800,
                  fontSize: 12,
                  color: STRATEGY_PALETTE[tooltip.strategyId]?.dot || "#fff",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STRATEGY_PALETTE[tooltip.strategyId]?.dot,
                  }}
                />
                {STRATEGY_PALETTE[tooltip.strategyId]?.name || tooltip.strategyId}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "#71717a" }}>Direction</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{tooltip.direction}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "#71717a" }}>Entry</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>${tooltip.entry.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "#71717a" }}>Take Profit</span>
                  <span style={{ color: STRATEGY_PALETTE[tooltip.strategyId]?.tpText, fontWeight: 700 }}>
                    ${tooltip.tp.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "#71717a" }}>Stop Loss</span>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>${tooltip.sl.toFixed(2)}</span>
                </div>
                {tooltip.isWin !== undefined && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: tooltip.isWin ? "rgba(163,230,53,0.1)" : "rgba(239,68,68,0.1)",
                      color: tooltip.isWin ? "#a3e635" : "#ef4444",
                      fontWeight: 700,
                      fontSize: 10,
                      textAlign: "center",
                    }}
                  >
                    {tooltip.isWin ? "✓ TP HIT" : "✕ SL HIT"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Hover detection overlay ─────────────────────────────────────── */}
      {/* We use a transparent mouse-tracking div over the canvas to detect proximity to known trade box price areas */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

