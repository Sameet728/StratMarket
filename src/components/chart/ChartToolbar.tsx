"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StratMarketLogo } from "@/components/StratMarketLogo";

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
  browserAlertsEnabled?: boolean;
  onToggleBrowserAlerts?: () => void;
  trialStatus?: string;
  daysLeft?: number;
  trialExpiry?: string | null;
}

const PINE_STRATEGIES = [
  { id: "PS-01", name: "Grandmaster Dual 10R / 8R", badge: "80.0% WR" },
  { id: "PS-02", name: "US Afternoon Reversal", badge: "83.3% WR" },
  { id: "PS-03", name: "London Core Expansion", badge: "80.0% WR" },
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
  browserAlertsEnabled = false,
  onToggleBrowserAlerts,
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
        <a href="/market" className="chart-back-btn" title="Back to Marketplace">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: "2px", flexShrink: 0 }}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <StratMarketLogo size={17} color="#ffffff" style={{ marginRight: "6px", flexShrink: 0 }} />
          <span className="chart-brand" style={{ whiteSpace: "nowrap" }}>StratMarket</span>
          <span className="chart-brand-sub" style={{ fontSize: "10.5px", color: "#a1a1aa", fontWeight: 500, marginLeft: "4px", opacity: 0.9, whiteSpace: "nowrap" }}>by Elvaris Capital</span>
        </a>

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
          type="button"
          className={`chart-btn-clean ${showBoxes ? "active" : ""}`}
          onClick={onToggleBoxes}
          style={{ touchAction: "manipulation" }}
          title="Toggle Visual Long/Short Position Tool Boxes on Chart"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: showBoxes ? "#a3e635" : "#52525b",
              boxShadow: showBoxes ? "0 0 6px #a3e635" : "none",
              display: "inline-block",
            }}
          />
          <span className="chart-btn-text-full">Position Boxes</span>
          <span className="chart-btn-text-short">Boxes</span>
        </button>

        {onToggleBrowserAlerts && (
          <button
            type="button"
            className={`chart-btn-clean ${browserAlertsEnabled ? "active" : ""}`}
            onClick={onToggleBrowserAlerts}
            style={{ touchAction: "manipulation" }}
            title={browserAlertsEnabled ? "Browser Chrome push alerts active - click to pause" : "Click to enable Chrome browser desktop notifications for trades, TP & SL"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={browserAlertsEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>{browserAlertsEnabled ? "Push ON" : "Push"}</span>
          </button>
        )}

        {onToggleAlert && (
          <button
            type="button"
            className={`chart-btn-clean ${alertEnabled ? "active" : ""}`}
            onClick={onToggleAlert}
            style={{ touchAction: "manipulation" }}
            title={alertEnabled ? "Email alerts active - click to mute" : "Click to enable real-time email trade alerts"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>{alertEnabled ? "Email ON" : "Email"}</span>
          </button>
        )}

        {/* Clean Minimal Live Feed Indicator */}
        <div className="chart-feed-status">
          <span
            className="feed-dot"
            style={{
              background: isLive ? "#a3e635" : "#71717a",
              boxShadow: isLive ? "0 0 8px #a3e635" : "none",
            }}
          />
          <span style={{ color: isLive ? "#a3e635" : "inherit" }}>{isLive ? "Live" : "Connecting"}</span>
        </div>

        {/* Direct Link to Profile */}
        <Link
          href="/profile"
          className="chart-btn-clean chart-nav-link"
          style={{ touchAction: "manipulation", textDecoration: "none" }}
          title="Open Profile, Alert Settings & Active Subscriptions"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </Link>

        {/* Direct Link to Dashboard */}
        <Link
          href="/dashboard"
          className="chart-btn-clean chart-nav-link"
          style={{ touchAction: "manipulation", textDecoration: "none" }}
          title="Open Quantitative Trading Dashboard"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          <span>Dashboard</span>
        </Link>

        {/* Strategy Details Sidebar Toggle */}
        <button
          type="button"
          className={`chart-btn-clean ${panelOpen ? "active" : ""}`}
          onClick={onTogglePanel}
          style={{ touchAction: "manipulation" }}
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
