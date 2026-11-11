"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StrategyChartContract } from "@/lib/strategy-execution";
import { reconstructTrades, TradeRecord } from "@/lib/trade-lifecycle";

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
  contract: StrategyChartContract | null;
  onClose: () => void;
  isOpen: boolean;
  candleCount: number;
  storedSignals?: StoredSignal[];
}

export function StrategyStatusPanel({ contract, onClose, isOpen, candleCount, storedSignals = [] }: Props) {
  const [tradeFilter, setTradeFilter] = useState<"ALL" | "STILL_OPEN" | "TP_HIT" | "SL_HIT">("ALL");
  const [tabMode, setTabMode] = useState<"TRADES" | "SIGNALS">("TRADES");

  // Reconstruct trades with explicit TP / SL / STILL OPEN lifecycles
  const trades = useMemo(() => {
    if (!contract) return [];
    return reconstructTrades(contract.strategyId, storedSignals, contract.tradeBoxes || []);
  }, [contract, storedSignals]);

  const openTrades = useMemo(() => trades.filter((t) => t.status === "STILL_OPEN"), [trades]);
  const tpTrades = useMemo(() => trades.filter((t) => t.status === "TP_HIT"), [trades]);
  const slTrades = useMemo(() => trades.filter((t) => t.status === "SL_HIT"), [trades]);

  const filteredTrades = useMemo(() => {
    if (tradeFilter === "ALL") return trades;
    return trades.filter((t) => t.status === tradeFilter);
  }, [trades, tradeFilter]);

  if (!isOpen || !contract) return null;

  const isPine = contract.implementationType === "PINE_SCRIPT";

  return (
    <aside className="chart-side-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-id-badge">{contract.strategyId}</span>
          <h3>{contract.name}</h3>
        </div>
        <button type="button" className="panel-close-btn" onClick={onClose} aria-label="Close panel" style={{ touchAction: "manipulation" }}>
          ✕
        </button>
      </div>

      <div className="panel-content">
        {/* Strategy Meta */}
        <div className="panel-section">
          <div className="panel-row">
            <span className="label">Platform</span>
            <span className="value-pine">{isPine ? "Pine Script v5" : "Python MT5"}</span>
          </div>
          <div className="panel-row">
            <span className="label">Asset & Timeframe</span>
            <span className="value">{contract.symbol} · {contract.timeframe}</span>
          </div>
          <div className="panel-row">
            <span className="label">Category</span>
            <span className="value">{contract.category}</span>
          </div>
          <div className="panel-row">
            <span className="label">Bars Loaded</span>
            <span className="value">{candleCount} real broker bars</span>
          </div>
        </div>

        {/* Private Execution Architecture */}
        <div className="panel-section">
          <div className="section-title">Execution Security</div>
          <div className="security-card">
            <div className="security-header">
              <span className="security-text">Private Execution Boundary</span>
            </div>
            <p className="security-desc">
              Strategy computed in private server environment. Source code is strictly isolated and never transmitted to the browser.
            </p>
            <div className="security-status-badge">
              <span className="status-indicator" />
              <span>{contract.summary.state}</span>
            </div>
          </div>
        </div>

        {/* Latest Signal Engine State */}
        {contract.summary.latestSignal && (
          <div className="panel-section">
            <div className="section-title">Engine Signal State</div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid #1f1f23",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    backgroundColor:
                      contract.summary.latestSignal.direction === "BUY"
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.1)",
                    color:
                      contract.summary.latestSignal.direction === "BUY"
                        ? "#000000"
                        : "#ffffff",
                    border: `1px solid ${
                      contract.summary.latestSignal.direction === "BUY"
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.25)"
                    }`,
                  }}
                >
                  {contract.summary.latestSignal.direction}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  ${contract.summary.latestSignal.price.toFixed(2)}
                </span>
              </div>
              <p
                style={{
                  fontSize: "11.5px",
                  color: "#a1a1aa",
                  margin: 0,
                  lineHeight: 1.45,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {contract.summary.latestSignal.label}
              </p>
            </div>
          </div>
        )}

        {/* Institutional HUD Metrics (Pine Script TV Engine Sync) */}
        {contract.summary.hudMetrics && contract.summary.hudMetrics.length > 0 && (
          <div className="panel-section">
            <div className="section-title">Institutional HUD Metrics</div>
            <div className="hud-metrics-list">
              {contract.summary.hudMetrics.map((m, idx) => (
                <div key={idx} className="panel-row">
                  <span className="label">{m.label}</span>
                  <span
                    className="value"
                    style={{
                      color: m.color === "#4ade80" ? "var(--lime, #a3e635)" : m.color || "#ffffff",
                    }}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk & Rules */}
        <div className="panel-section">
          <div className="section-title">Risk Governance & Payoff</div>
          <div className="risk-grid">
            <div className="risk-box">
              <span className="risk-label">Target Payoff (TP)</span>
              <span className="risk-val-tp">{contract.summary.riskParameters.takeProfit || "+1.29R (+18.0 pts)"}</span>
            </div>
            <div className="risk-box">
              <span className="risk-label">Max Risk Stop (SL)</span>
              <span className="risk-val-sl">{contract.summary.riskParameters.stopLoss || "-1.00R (-14.0 pts)"}</span>
            </div>
          </div>
          <p className="risk-rules-text">{contract.summary.riskParameters.rules}</p>
        </div>

        {/* Plotted Overlays on Chart */}
        <div className="panel-section">
          <div className="section-title">Plotted Overlays ({contract.series.length})</div>
          <div className="overlays-list">
            {contract.series.map((s) => {
              const displayName = s.name.startsWith("Fast EMA")
                ? "Fast Trend Velocity"
                : s.name.startsWith("Macro EMA")
                ? "Macro Regime Baseline"
                : s.name.startsWith("Upper Band")
                ? "Upper Volatility Barrier"
                : s.name.startsWith("Band Basis")
                ? "Mean Reversion Median"
                : s.name.startsWith("Lower Band")
                ? "Lower Volatility Barrier"
                : s.name;
              return (
                <div key={s.id} className="overlay-item">
                  <span className="overlay-color-chip" style={{ backgroundColor: s.color }} />
                  <span className="overlay-name">{displayName}</span>
                </div>
              );
            })}
            {contract.priceLevels
              .filter((lvl) => {
                const hasActiveTrade = contract.priceLevels.some((l) => l.name.startsWith("Active "));
                if (hasActiveTrade) {
                  return lvl.name.startsWith("Active ");
                }
                // When flat / monitoring, only show Market Price reference level
                return lvl.name.includes("Market Price");
              })
              .map((lvl) => {
                const displayLvl = lvl.name.includes("Target Payoff")
                  ? "Target Payoff Level"
                  : lvl.name.includes("Max Risk Stop")
                  ? "Max Risk Stop Level"
                  : lvl.name.includes("Active Entry")
                  ? "Active Position Entry"
                  : lvl.name.includes("Active Take Profit")
                  ? "Active Target Payoff"
                  : lvl.name.includes("Active Stop Loss")
                  ? "Active Risk Stop"
                  : lvl.name.includes("Market Price")
                  ? "Live Market Price"
                  : lvl.name;
                return (
                  <div key={lvl.name} className="overlay-item">
                    <span
                      className="overlay-color-chip"
                      style={{
                        backgroundColor: lvl.color,
                        borderStyle: lvl.style,
                        borderWidth: 1,
                      }}
                    />
                    <span className="overlay-name">
                      {displayLvl}: ${lvl.price.toFixed(2)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Trade Execution History & Live Lifecycle */}
        <div className="panel-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="section-title" style={{ margin: 0 }}>
              Trades & Execution History
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => setTabMode("TRADES")}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 5,
                  border: "1px solid",
                  borderColor: tabMode === "TRADES" ? "rgba(163, 230, 53, 0.4)" : "#27272a",
                  background: tabMode === "TRADES" ? "rgba(163, 230, 53, 0.12)" : "transparent",
                  color: tabMode === "TRADES" ? "#a3e635" : "#71717a",
                  cursor: "pointer",
                }}
              >
                Trades ({trades.length})
              </button>
              <button
                type="button"
                onClick={() => setTabMode("SIGNALS")}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 5,
                  border: "1px solid",
                  borderColor: tabMode === "SIGNALS" ? "rgba(16, 185, 129, 0.4)" : "#27272a",
                  background: tabMode === "SIGNALS" ? "rgba(16, 185, 129, 0.12)" : "transparent",
                  color: tabMode === "SIGNALS" ? "#10b981" : "#71717a",
                  cursor: "pointer",
                }}
              >
                Raw Signals ({storedSignals.length})
              </button>
            </div>
          </div>

          {tabMode === "TRADES" ? (
            <>
              {/* Active Position Banner if any position is still open */}
              {openTrades.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        boxShadow: "0 0 10px #3b82f6",
                      }}
                    />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#93c5fd" }}>
                      {openTrades.length} Active Position Open
                    </span>
                  </div>
                  <span style={{ fontSize: 10.5, color: "#bfdbfe", fontFamily: "'JetBrains Mono', monospace" }}>
                    {openTrades[0].direction} @ ${openTrades[0].entryPrice.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Status Filter Chips */}
              <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                {(
                  [
                    { key: "ALL", label: `All (${trades.length})` },
                    { key: "STILL_OPEN", label: `Still Open (${openTrades.length})`, count: openTrades.length },
                    { key: "TP_HIT", label: `TP Hit (${tpTrades.length})`, count: tpTrades.length },
                    { key: "SL_HIT", label: `SL Hit (${slTrades.length})`, count: slTrades.length },
                  ] as const
                ).map((chip) => {
                  const isActive = tradeFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setTradeFilter(chip.key)}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 12,
                        border: "1px solid",
                        borderColor: isActive
                          ? chip.key === "TP_HIT"
                            ? "#10b981"
                            : chip.key === "SL_HIT"
                            ? "#ef4444"
                            : chip.key === "STILL_OPEN"
                            ? "#3b82f6"
                            : "#ffffff"
                          : "#27272a",
                        background: isActive
                          ? chip.key === "TP_HIT"
                            ? "rgba(16, 185, 129, 0.15)"
                            : chip.key === "SL_HIT"
                            ? "rgba(239, 68, 68, 0.15)"
                            : chip.key === "STILL_OPEN"
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(255, 255, 255, 0.1)"
                          : "rgba(255, 255, 255, 0.02)",
                        color: isActive
                          ? chip.key === "TP_HIT"
                            ? "#34d399"
                            : chip.key === "SL_HIT"
                            ? "#f87171"
                            : chip.key === "STILL_OPEN"
                            ? "#60a5fa"
                            : "#ffffff"
                          : "#a1a1aa",
                        cursor: "pointer",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Trades List */}
              {filteredTrades.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {filteredTrades.slice(0, 10).map((t, idx) => {
                    const isLong = t.direction === "LONG";
                    const isOpen = t.status === "STILL_OPEN";
                    const isTP = t.status === "TP_HIT";
                    const isSL = t.status === "SL_HIT";

                    const statusBg = isOpen
                      ? "rgba(59, 130, 246, 0.12)"
                      : isTP
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(239, 68, 68, 0.12)";
                    const statusColor = isOpen ? "#60a5fa" : isTP ? "#34d399" : "#f87171";
                    const statusBorder = isOpen ? "rgba(59, 130, 246, 0.35)" : isTP ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)";

                    const entryDate = new Date(t.entryTime);
                    const timeStr = entryDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    const dateStr = entryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 9,
                          background: "rgba(255, 255, 255, 0.025)",
                          border: `1px solid ${statusBorder}`,
                          boxShadow: isOpen ? "0 0 14px rgba(59, 130, 246, 0.15)" : "none",
                        }}
                      >
                        {/* Header: Trade # + Direction + Prominent Status Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: "#ffffff",
                                fontFamily: "'JetBrains Mono', monospace",
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.16)",
                                padding: "2px 7px",
                                borderRadius: 4,
                                letterSpacing: "0.02em",
                              }}
                            >
                              Trade #{t.tradeNumber}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: 4,
                                background: isLong ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                color: isLong ? "#10b981" : "#ef4444",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {isLong ? "▲ LONG" : "▼ SHORT"}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", fontFamily: "'JetBrains Mono', monospace" }}>
                              @ ${t.entryPrice.toFixed(2)}
                            </span>
                          </div>

                          {/* Outcome / Status Badge */}
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "2px 8px",
                              borderRadius: 5,
                              fontSize: 10.5,
                              fontWeight: 800,
                              letterSpacing: "0.03em",
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusBorder}`,
                            }}
                          >
                            {isOpen ? (
                              <>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa" }} />
                                STILL OPEN
                              </>
                            ) : isTP ? (
                              <>✓ TP HIT ({t.pnlR})</>
                            ) : (
                              <>✕ SL HIT ({t.pnlR})</>
                            )}
                          </span>
                        </div>

                        {/* Mid Row: TP & SL Bracket Levels */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 10.5,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: "5px 8px",
                            borderRadius: 6,
                            background: "rgba(0, 0, 0, 0.25)",
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ color: "#34d399" }}>
                            TP: ${t.targetPrice.toFixed(2)}
                          </span>
                          <span style={{ color: "#f87171" }}>
                            SL: ${t.stopLoss.toFixed(2)}
                          </span>
                          {t.exitPrice && (
                            <span style={{ color: "#e4e4e7" }}>
                              Exit: ${t.exitPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Footer: Date & Trade Reference */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#71717a" }}>
                          <span>
                            {isOpen ? "Active Market Position" : isTP ? "Target Payoff Achieved" : "Strict Risk Guard Hit"}
                          </span>
                          <span>
                            {timeStr} · {dateStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid #1f1f23",
                    fontSize: 11.5,
                    color: "#71717a",
                    lineHeight: 1.5,
                    textAlign: "center",
                  }}
                >
                  No trades match the selected status filter.
                </div>
              )}
            </>
          ) : (
            /* Raw Signal View */
            <div style={{ display: "grid", gap: 6 }}>
              {storedSignals.slice(0, 10).map((sig) => {
                const isTP = sig.signalType === "TAKE_PROFIT";
                const isSL = sig.signalType === "STOP_LOSS";
                const isLong = sig.direction === "LONG";
                const color = isTP ? "#10b981" : isSL ? "#ef4444" : isLong ? "#10b981" : "#ef4444";
                const label = isTP ? "TP HIT" : isSL ? "SL HIT" : `${sig.signalType} ${sig.direction}`;
                const ts = new Date(sig.timestamp);
                const timeStr = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                const dateStr = ts.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

                return (
                  <div
                    key={sig.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color }}>{label}</div>
                      {sig.entryPrice && (
                        <div style={{ fontSize: 10, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
                          @ ${sig.entryPrice.toFixed(2)} · SL ${sig.stopLoss?.toFixed(2) || "—"} · TP ${sig.targetPrice?.toFixed(2) || "—"}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#71717a", textAlign: "right", flexShrink: 0 }}>
                      <div>{timeStr}</div>
                      <div>{dateStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="panel-section panel-actions">
          <Link
            href={`/strategies/${contract.strategyId.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="panel-btn-report"
          >
            Open Audited Performance Report ↗
          </Link>
          <Link href="/market" className="panel-btn-back">
            Return to Marketplace
          </Link>
        </div>
      </div>
    </aside>
  );
}
