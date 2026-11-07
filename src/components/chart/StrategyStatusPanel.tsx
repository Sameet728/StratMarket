"use client";

import Link from "next/link";
import { StrategyChartContract } from "@/lib/strategy-execution";

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
  if (!isOpen || !contract) return null;

  const isPine = contract.implementationType === "PINE_SCRIPT";

  return (
    <aside className="chart-side-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-id-badge">{contract.strategyId}</span>
          <h3>{contract.name}</h3>
        </div>
        <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">
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
                  <span className="value" style={{ color: "#ffffff" }}>
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
            {contract.priceLevels.map((lvl) => {
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
                ? "Market Price"
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

        {/* Live VPS Signal Feed */}
        <div className="panel-section">
          <div className="section-title">
            Live VPS Signals
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "2px 6px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
              {storedSignals.length > 0 ? `${storedSignals.length} signals` : "LIVE"}
            </span>
          </div>
          {storedSignals.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              {storedSignals.slice(0, 8).map((sig) => {
                const isEntry = sig.signalType === "ENTRY";
                const isTP = sig.signalType === "TAKE_PROFIT";
                const isSL = sig.signalType === "STOP_LOSS";
                const isLong = sig.direction === "LONG";

                const color = isTP ? "#10b981" : isSL ? "#ef4444" : isLong ? "#10b981" : "#ef4444";
                const bg = isTP
                  ? "rgba(16,185,129,0.07)"
                  : isSL
                  ? "rgba(239,68,68,0.07)"
                  : "rgba(255,255,255,0.03)";
                const icon = isTP ? "▲" : isSL ? "▼" : isLong ? "▲" : "▼";
                const label = isTP
                  ? "TP HIT"
                  : isSL
                  ? "SL HIT"
                  : `${sig.signalType} ${sig.direction}`;

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
                      background: bg,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.04em" }}>{label}</div>
                        {sig.entryPrice && (
                          <div style={{ fontSize: 10, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                            @ ${sig.entryPrice.toFixed(2)}
                            {sig.stopLoss && ` · SL $${sig.stopLoss.toFixed(2)}`}
                            {sig.targetPrice && ` · TP $${sig.targetPrice.toFixed(2)}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#71717a", textAlign: "right", flexShrink: 0 }}>
                      <div>{timeStr}</div>
                      <div>{dateStr}</div>
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
              }}
            >
              <span style={{ color: "#10b981" }}>●</span> VPS engine monitoring live markets 24/7.
              <br />
              Signals appear here in real-time when conditions are met.
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
