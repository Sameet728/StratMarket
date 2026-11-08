"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  trialExpiry?: string | null;
}

const PINE_STRATEGIES = [
  { id: "PS-01", name: "Grandmaster", badge: "82.6% WR" },
  { id: "PS-02", name: "Apex", badge: "88.5% WR" },
  { id: "PS-03", name: "Strict 1:2 R:R", badge: "74.1% WR" },
  { id: "PS-04", name: "Elite", badge: "80.7% WR" },
];

function formatCountdown(targetMs: number): string {
  const diff = targetMs - Date.now();
  if (diff <= 0) return "Trial Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

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
  trialExpiry,
}: Props) {
  const isLive = status === "LIVE";

  // Calculate live countdown for active trial
  const [timerText, setTimerText] = useState<string>(() => {
    if (trialExpiry) {
      return formatCountdown(new Date(trialExpiry).getTime());
    }
    if (trialStatus === "ACTIVE" && daysLeft) {
      return `${daysLeft}d left`;
    }
    return "";
  });

  useEffect(() => {
    if (trialStatus !== "ACTIVE") return;

    let targetMs: number | null = null;
    if (trialExpiry) {
      targetMs = new Date(trialExpiry).getTime();
    } else if (daysLeft) {
      // Fallback target based on days remaining
      targetMs = Date.now() + daysLeft * 24 * 60 * 60 * 1000;
    }

    if (!targetMs) return;

    // Immediate calculation
    setTimerText(formatCountdown(targetMs));

    const interval = setInterval(() => {
      setTimerText(formatCountdown(targetMs!));
    }, 1000);

    return () => clearInterval(interval);
  }, [trialStatus, trialExpiry, daysLeft]);

  return (
    <header className="chart-toolbar">
      <div className="chart-toolbar-left">
        <Link href="/market" className="chart-back-btn" title="Back to Marketplace">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="chart-brand">StratMarket</span>
          <span style={{ fontSize: "10.5px", color: "#e2b342", fontWeight: 500, marginLeft: "4px", opacity: 0.9 }}>by Elvaris Capital</span>
        </Link>

        <div className="chart-divider" />

        {/* Unified Single Clean Strategy Dropdown */}
        <div className="chart-strategy-unified">
          <select
            className="chart-strategy-select-clean"
            value={strategyId.toUpperCase()}
            onChange={(e) => {
              window.location.href = `/chart/${e.target.value}`;
            }}
            title="Switch Strategy"
          >
            {PINE_STRATEGIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.name} ({p.badge})
              </option>
            ))}
          </select>
        </div>

        {/* Minimal Clean Asset & Timeframe Tag */}
        <div className="chart-symbol-clean">
          <span className="sym">{symbol}</span>
          <span className="dot">·</span>
          <span className="tf">15m</span>
        </div>
      </div>

      <div className="chart-toolbar-right">
        {/* Toggle On-Chart Position Tool Boxes */}
        <button
          className={`chart-btn-clean ${showBoxes ? "active" : ""}`}
          onClick={onToggleBoxes}
          title="Toggle Visual Long/Short Position Tool Boxes on Chart"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: showBoxes ? "#ffffff" : "#52525b",
              display: "inline-block",
            }}
          />
          <span>Position Boxes</span>
        </button>

        {onToggleAlert && (
          <button
            className={`chart-btn-clean ${alertEnabled ? "active" : ""}`}
            onClick={onToggleAlert}
            title={alertEnabled ? "Email alerts active - click to mute" : "Click to enable real-time email trade alerts"}
          >
            <span>{alertEnabled ? "Alerts ON" : "Alerts OFF"}</span>
          </button>
        )}

        {/* Clean Minimal Live Feed Indicator */}
        <div className="chart-feed-status">
          <span
            className="feed-dot"
            style={{
              background: isLive ? "#ffffff" : "#71717a",
            }}
          />
          <span>{isLive ? "Live Feed" : "Connecting"}</span>
        </div>

        {/* Strategy Details Sidebar Toggle */}
        <button
          className={`chart-btn-clean ${panelOpen ? "active" : ""}`}
          onClick={onTogglePanel}
          title={panelOpen ? "Hide Strategy Details Panel" : "Show Strategy Details Panel"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <span>Strategy</span>
        </button>
      </div>
    </header>
  );
}
