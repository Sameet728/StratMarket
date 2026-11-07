"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  strategyId: string;
  strategyName: string;
  symbol: string;
  timeframe?: string;
  candleCount?: number;
  status: "LIVE" | "HISTORICAL" | "CONNECTING" | "ERROR";
  onTimeframeChange?: (tf: string) => void;
  onTogglePanel: () => void;
  panelOpen: boolean;
  showBoxes: boolean;
  onToggleBoxes: () => void;
  alertEnabled?: boolean;
  onToggleAlert?: () => void;
  trialStatus?: string;
  daysLeft?: number;
}

const PINE_STRATEGIES = [
  { id: "PS-01", name: "Grandmaster", badge: "82.6% WR" },
  { id: "PS-02", name: "Apex", badge: "88.5% WR" },
  { id: "PS-03", name: "Strict 1:2 R:R", badge: "74.1% WR" },
  { id: "PS-04", name: "Elite", badge: "80.7% WR" },
];

export function ChartToolbar({
  strategyId,
  strategyName,
  symbol,
  status,
  onTogglePanel,
  panelOpen,
  showBoxes,
  onToggleBoxes,
  alertEnabled = false,
  onToggleAlert,
  trialStatus,
  daysLeft,
}: Props) {
  const isLive = status === "LIVE";

  return (
    <header className="chart-toolbar">
      <div className="chart-toolbar-left">
        <Link href="/market" className="chart-back-btn" title="Back to Marketplace">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="chart-brand">StratMarket</span>
        </Link>

        <div className="chart-divider" />

        <div className="chart-strategy-badge">
          <span className="chart-id-chip">{strategyId}</span>
          {strategyId.toUpperCase().startsWith("PS-") ? (
            <select
              className="chart-strategy-select"
              value={strategyId.toUpperCase()}
              onChange={(e) => {
                window.location.href = `/chart/${e.target.value}`;
              }}
              title="Switch Champion Pine Strategy Chart"
            >
              {PINE_STRATEGIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.badge})
                </option>
              ))}
            </select>
          ) : (
            <span className="chart-name-title">{strategyName}</span>
          )}
        </div>

        <div className="chart-symbol-badge">
          <span className="chart-symbol">{symbol}</span>
          <span className="chart-tf-tag" style={{ background: "rgba(255, 255, 255, 0.12)", color: "#ffffff", fontWeight: 700 }}>
            15m (Locked)
          </span>
        </div>

        {trialStatus === "ACTIVE" && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              whiteSpace: "nowrap",
            }}
          >
            Trial Active ({daysLeft}d left)
          </span>
        )}
      </div>

      <div className="chart-toolbar-center">
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            padding: "4px 12px",
            borderRadius: "6px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: "uppercase",
          }}
        >
          Institutional M15 Execution Timeframe
        </div>
      </div>

      <div className="chart-toolbar-right">
        {/* Toggle On-Chart Position Tool Boxes */}
        <button
          className={`chart-toggle-pill ${showBoxes ? "active" : ""}`}
          onClick={onToggleBoxes}
          title="Toggle Visual Long/Short Position Tool Boxes on Chart"
        >
          <span className="pill-dot" />
          <span>Position Boxes</span>
        </button>

        {onToggleAlert && (
          <button
            className={`chart-toggle-pill ${alertEnabled ? "active" : ""}`}
            onClick={onToggleAlert}
            title={alertEnabled ? "Email alerts active - click to mute" : "Click to enable real-time email trade alerts"}
            style={{
              background: alertEnabled ? "rgba(255, 255, 255, 0.12)" : undefined,
              borderColor: alertEnabled ? "#ffffff" : undefined,
              color: alertEnabled ? "#ffffff" : undefined,
            }}
          >
            <span>{alertEnabled ? "Alerts ON" : "Alerts OFF"}</span>
          </button>
        )}

        <div className={`chart-status-pill ${isLive ? "live" : "connecting"}`}>
          <span className="chart-status-dot" />
          <span>{isLive ? "TradingView Live Feed" : "Connecting Feed..."}</span>
        </div>

        <button
          className={`chart-icon-btn ${panelOpen ? "active" : ""}`}
          onClick={onTogglePanel}
          title={panelOpen ? "Hide Strategy Panel" : "Show Strategy Panel"}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <span className="chart-btn-label">Strategy</span>
        </button>
      </div>
    </header>
  );
}
