"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { StratMarketLogo } from "@/components/StratMarketLogo";

interface AnalyticsData {
  summary: {
    totalPageViews: number;
    uniqueSessions: number;
    activeUsersNow: number;
    avgSessionDurationSeconds: number;
    avgSessionDurationFormatted: string;
    totalRegisteredUsers: number;
    totalAlertReceivers: number;
    totalSignalsSent: number;
    totalDeliveries: number;
    deliverySuccessRate: number;
    databaseStatus: string;
    vpsStatus: string;
    lastHeartbeatTime: string;
    lastHeartbeatTimeFormatted: string;
  };
  traffic: {
    topPages: Array<{ path: string; views: number; percentage: number }>;
    devices: Array<{ device: string; count: number; percentage: number }>;
    browsers: Array<{ browser: string; count: number; percentage: number }>;
    operatingSystems: Array<{ os: string; count: number; percentage: number }>;
    locations: Array<{ country: string; city?: string; count: number }>;
  };
  registeredUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "ADMIN";
    accountStatus: string;
    emailVerified: boolean;
    testEmailSent: boolean;
    testEmailSentCount: number;
    totalAlertsReceived: number;
    createdAt: string;
    createdAtFormatted: string;
    isOnlineNow: boolean;
    lastSeenAt?: string;
  }>;
  alertReceivers: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    verifiedDestination: string;
    enabled: boolean;
    alertTypes: string[];
    strategiesCount: number;
    strategiesList: string[];
    totalAlertsReceived: number;
    lastAlertReceivedAt?: string;
    lastAlertReceivedAtFormatted: string;
  }>;
  signalsTelemetry: {
    totalSignals: number;
    totalDispatches: number;
    byStrategy: Array<{
      strategyId: string;
      strategyName: string;
      signalsCount: number;
      dispatchesCount: number;
      lastSignalTime?: string;
      lastSignalTimeFormatted?: string;
    }>;
    recentSignals: Array<{
      id: string;
      strategyId: string;
      strategyName: string;
      instrument: string;
      timeframe: string;
      signalType: string;
      direction: string;
      entryPrice?: number;
      stopLoss?: number;
      targetPrice?: number;
      timestamp: string;
      timestampFormatted: string;
      sourceProvenance: string;
      dispatchedCount: number;
    }>;
    recentDeliveries: Array<{
      id: string;
      signalId: string;
      recipientEmail: string;
      strategyId: string;
      strategyName: string;
      instrument: string;
      direction: string;
      deliveryStatus: string;
      sentAt: string;
      sentAtFormatted: string;
    }>;
  };
  minuteActivityFeed: Array<{
    id: string;
    timestamp: string;
    timestampFormatted: string;
    type: "PAGE_VIEW" | "SESSION_HEARTBEAT" | "USER_REGISTER" | "SIGNAL_GENERATED" | "ALERT_DELIVERED" | "PASSWORD_RESET";
    title: string;
    description: string;
    actor?: string;
    badgeColor: "lime" | "cyan" | "amber" | "rose" | "purple";
  }>;
}

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "users" | "alerts" | "signals" | "traffic">("feed");

  // Filter states
  const [feedFilter, setFeedFilter] = useState<string>("ALL");
  const [feedSearch, setFeedSearch] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [alertSearch, setAlertSearch] = useState<string>("");

  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await fetch("/api/analytics/overview", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to load platform telemetry overview");
      const json = await res.json();
      setData(json);
      setLastRefreshedAt(new Date());
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load telemetry");
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filtered Minute-by-Minute feed
  const filteredFeed = useMemo(() => {
    if (!data?.minuteActivityFeed) return [];
    return data.minuteActivityFeed.filter((item) => {
      if (feedFilter !== "ALL" && item.type !== feedFilter) return false;
      if (feedSearch.trim()) {
        const q = feedSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.actor && item.actor.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data?.minuteActivityFeed, feedFilter, feedSearch]);

  // Filtered Registered Users
  const filteredUsers = useMemo(() => {
    if (!data?.registeredUsers) return [];
    if (!userSearch.trim()) return data.registeredUsers;
    const q = userSearch.toLowerCase();
    return data.registeredUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [data?.registeredUsers, userSearch]);

  // Filtered Alert Receivers
  const filteredAlertReceivers = useMemo(() => {
    if (!data?.alertReceivers) return [];
    if (!alertSearch.trim()) return data.alertReceivers;
    const q = alertSearch.toLowerCase();
    return data.alertReceivers.filter(
      (ar) =>
        ar.verifiedDestination.toLowerCase().includes(q) ||
        ar.userEmail.toLowerCase().includes(q) ||
        ar.strategiesList.some((s) => s.toLowerCase().includes(q))
    );
  }, [data?.alertReceivers, alertSearch]);

  if (loading) {
    return (
      <div className="wrap admin-wrap" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ width: "42px", height: "42px", borderRadius: "50%", border: "2px solid rgba(163, 230, 53, 0.2)", borderTopColor: "var(--lime)", animation: "spin 0.8s linear infinite", marginBottom: "20px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em" }}>Connecting to Real-Time Telemetry Pipeline...</h2>
        <p className="note" style={{ marginTop: "8px" }}>Streaming institutional MongoDB Atlas records and VPS signal feeds.</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="wrap admin-wrap" style={{ textAlign: "center", minHeight: "60vh", paddingTop: "40px" }}>
        <h2 style={{ color: "#ef4444" }}>Telemetry Pipeline Offline</h2>
        <p className="note" style={{ margin: "16px auto", maxWidth: "500px" }}>{error || "Unable to retrieve platform metrics."}</p>
        <button type="button" className="pill g" onClick={() => fetchData(true)} style={{ touchAction: "manipulation" }}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="wrap admin-wrap" style={{ maxWidth: "1360px", margin: "0 auto", paddingBottom: "80px" }}>
      {/* Top Breadcrumb & Live Status Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/" className="logo" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <StratMarketLogo size={20} color="#ffffff" />
            <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "-0.02em" }}>StratMarket</span>
          </Link>
          <span style={{ color: "var(--mut)", fontSize: "13px" }}>/</span>
          <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "13px" }}>Real-Time Telemetry & Site Analytics</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              background: "rgba(163, 230, 53, 0.12)",
              border: "1px solid rgba(163, 230, 53, 0.35)",
              borderRadius: "999px",
              color: "var(--lime)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--lime)", boxShadow: "0 0 10px var(--lime)" }} />
            Live Monitored
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? "rgba(163, 230, 53, 0.12)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${autoRefresh ? "rgba(163, 230, 53, 0.35)" : "var(--line)"}`,
              color: autoRefresh ? "var(--lime)" : "var(--mut)",
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              touchAction: "manipulation",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: autoRefresh ? "var(--lime)" : "var(--mut)" }} />
            {autoRefresh ? "Auto-Refresh (10s)" : "Auto-Refresh: Paused"}
          </button>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="pill g sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", touchAction: "manipulation" }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: isRefreshing ? "spin 0.8s linear infinite" : "none" }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
            {lastRefreshedAt ? `Updated ${lastRefreshedAt.toLocaleTimeString()}` : "Live Connected"}
          </span>
        </div>
      </div>

      {/* Main Page Title */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#ffffff", marginBottom: "8px" }}>
          Platform Telemetry & User Analytics
        </h1>
        <p style={{ color: "var(--mut)", fontSize: "14px", maxWidth: "800px", lineHeight: "1.5" }}>
          Full 24/7 minute-by-minute institutional telemetry across site visitors, user registrations, real-time alert subscribers, and algorithmic VPS signal dispatches.
        </p>
      </div>

      {/* Primary KPI Ribbon (8 Cards) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "32px",
        }}
      >
        {/* Active Now */}
        <div style={{ background: "rgba(163, 230, 53, 0.04)", border: "1px solid rgba(163, 230, 53, 0.3)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--lime)", letterSpacing: "0.02em" }}>ACTIVE ONLINE NOW</span>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--lime)", boxShadow: "0 0 12px var(--lime)" }} />
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.activeUsersNow}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Active heartbeat within last 5m</div>
        </div>

        {/* Total Page Views */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>TOTAL SITE VISITS</span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>{data.summary.uniqueSessions} unique</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.totalPageViews.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Page visits & terminal views</div>
        </div>

        {/* Avg Dwell Time on Site */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>AVG TIME ON SITE</span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--lime)" }}>Live Heartbeat</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.avgSessionDurationFormatted}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Per visitor session duration</div>
        </div>

        {/* Registered Users */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>REGISTERED TRADERS</span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--lime)" }}>MongoDB Atlas</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.totalRegisteredUsers}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>100% Free Open Platform access</div>
        </div>

        {/* Alert Receivers */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>ACTIVE ALERT INBOXES</span>
            <span className="mono" style={{ fontSize: "11px", color: "#38bdf8" }}>Resend SMTP</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.totalAlertReceivers}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Receiving live signals (PS-01/02/03)</div>
        </div>

        {/* Signals Sent */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>SIGNALS INGESTED</span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--lime)" }}>Quant VPS</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.totalSignalsSent}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Tick-verified VPS executions</div>
        </div>

        {/* Total Deliveries Sent */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>EMAILS DISPATCHED</span>
            <span className="mono" style={{ fontSize: "11px", color: "#38bdf8" }}>Deliveries</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
            {data.summary.totalDeliveries.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Dispatched to trader inboxes</div>
        </div>

        {/* Delivery SLA */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--mut)", letterSpacing: "0.02em" }}>DELIVERY SLA</span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--lime)" }}>100.0% SLA</span>
          </div>
          <div className="mono" style={{ fontSize: "28px", fontWeight: 800, color: "var(--lime)", lineHeight: 1.1 }}>
            {data.summary.deliverySuccessRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "6px" }}>Institutional delivery reliability</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "14px",
          marginBottom: "28px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            background: activeTab === "feed" ? "#ffffff" : "transparent",
            color: activeTab === "feed" ? "#000000" : "var(--mut)",
            fontWeight: 700,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            touchAction: "manipulation",
          }}
        >
          <span>⏱ Live Minute Activity Feed</span>
          <span
            className="mono"
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: activeTab === "feed" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
            }}
          >
            {data.minuteActivityFeed.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            background: activeTab === "users" ? "#ffffff" : "transparent",
            color: activeTab === "users" ? "#000000" : "var(--mut)",
            fontWeight: 700,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            touchAction: "manipulation",
          }}
        >
          <span>👥 Registered Traders</span>
          <span
            className="mono"
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: activeTab === "users" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
            }}
          >
            {data.registeredUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("alerts")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            background: activeTab === "alerts" ? "#ffffff" : "transparent",
            color: activeTab === "alerts" ? "#000000" : "var(--mut)",
            fontWeight: 700,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            touchAction: "manipulation",
          }}
        >
          <span>🔔 Alert Receivers</span>
          <span
            className="mono"
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: activeTab === "alerts" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
            }}
          >
            {data.alertReceivers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("signals")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            background: activeTab === "signals" ? "#ffffff" : "transparent",
            color: activeTab === "signals" ? "#000000" : "var(--mut)",
            fontWeight: 700,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            touchAction: "manipulation",
          }}
        >
          <span>📡 Signals & Deliveries</span>
          <span
            className="mono"
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: activeTab === "signals" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
            }}
          >
            {data.summary.totalSignalsSent}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("traffic")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            background: activeTab === "traffic" ? "#ffffff" : "transparent",
            color: activeTab === "traffic" ? "#000000" : "var(--mut)",
            fontWeight: 700,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            touchAction: "manipulation",
          }}
        >
          <span>📊 Traffic & Dwell Time</span>
          <span
            className="mono"
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: activeTab === "traffic" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
            }}
          >
            {data.traffic.topPages.length}
          </span>
        </button>
      </div>

      {/* TAB 1: MINUTE-BY-MINUTE LIVE FEED */}
      {activeTab === "feed" && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {["ALL", "USER_REGISTER", "SIGNAL_GENERATED", "ALERT_DELIVERED", "PAGE_VIEW", "PASSWORD_RESET"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFeedFilter(filter)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: feedFilter === filter ? "rgba(163, 230, 53, 0.15)" : "rgba(255, 255, 255, 0.04)",
                    color: feedFilter === filter ? "var(--lime)" : "var(--mut)",
                    border: `1px solid ${feedFilter === filter ? "rgba(163, 230, 53, 0.35)" : "var(--line)"}`,
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                >
                  {filter === "ALL" && "All Activity"}
                  {filter === "USER_REGISTER" && "Registrations"}
                  {filter === "SIGNAL_GENERATED" && "VPS Signals"}
                  {filter === "ALERT_DELIVERED" && "Email Alerts"}
                  {filter === "PAGE_VIEW" && "Page Views"}
                  {filter === "PASSWORD_RESET" && "Password Resets"}
                </button>
              ))}
            </div>

            <div style={{ position: "relative", minWidth: "260px" }}>
              <input
                type="text"
                placeholder="Search event details or user..."
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--mut)"
                strokeWidth="2"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>

          {/* Activity Feed Timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredFeed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", border: "1px dashed var(--line)", borderRadius: "12px", color: "var(--mut)" }}>
                No events match current filter.
              </div>
            ) : (
              filteredFeed.map((event) => {
                const getBadgeStyle = (color: string) => {
                  switch (color) {
                    case "lime":
                      return { bg: "rgba(163, 230, 53, 0.12)", border: "rgba(163, 230, 53, 0.35)", color: "var(--lime)" };
                    case "rose":
                      return { bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.35)", color: "#f43f5e" };
                    case "cyan":
                      return { bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.35)", color: "#38bdf8" };
                    case "amber":
                      return { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.35)", color: "#f59e0b" };
                    case "purple":
                      return { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.35)", color: "#c084fc" };
                    default:
                      return { bg: "rgba(255, 255, 255, 0.05)", border: "var(--line)", color: "var(--mut)" };
                  }
                };
                const style = getBadgeStyle(event.badgeColor);

                return (
                  <div
                    key={event.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.015)",
                      border: "1px solid var(--line)",
                      borderRadius: "10px",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            color: style.color,
                          }}
                        >
                          {event.type.replace("_", " ")}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>{event.title}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--mut)", margin: 0, lineHeight: 1.45 }}>{event.description}</p>
                    </div>

                    <div style={{ textAlign: "right", minWidth: "180px" }}>
                      <div className="mono" style={{ fontSize: "12px", color: "var(--lime)", fontWeight: 600 }}>
                        {event.timestampFormatted}
                      </div>
                      {event.actor && (
                        <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "4px" }}>
                          Actor: <span className="mono" style={{ color: "#d4d4d8" }}>{event.actor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED USERS DIRECTORY */}
      {activeTab === "users" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
                Registered Traders Directory ({data.registeredUsers.length} Total Users)
              </h3>
              <p style={{ fontSize: "13px", color: "var(--mut)" }}>
                Exact registration timestamps down to the second, email verification, test email quotas, and active session status.
              </p>
            </div>

            <div style={{ position: "relative", minWidth: "280px" }}>
              <input
                type="text"
                placeholder="Search trader email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--mut)"
                strokeWidth="2"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>TRADER ACCOUNT</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>REGISTRATION TIMESTAMP</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>ROLE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>TEST EMAIL</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>ALERTS RECEIVED</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>LIVE TELEMETRY</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr
                    key={user.id || idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#ffffff" }}>{user.name}</div>
                      <div className="mono" style={{ fontSize: "12px", color: "var(--mut)", marginTop: "2px" }}>
                        {user.email}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="mono" style={{ fontSize: "12px", color: "var(--lime)" }}>
                        {user.createdAtFormatted}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: user.accountStatus === "ACTIVE" ? "rgba(163, 230, 53, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          color: user.accountStatus === "ACTIVE" ? "var(--lime)" : "#ef4444",
                          border: `1px solid ${user.accountStatus === "ACTIVE" ? "rgba(163, 230, 53, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                        }}
                      >
                        {user.accountStatus}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontSize: "12px", color: user.role === "ADMIN" ? "#f59e0b" : "var(--mut)" }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {user.testEmailSent ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "rgba(56, 189, 248, 0.1)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.25)",
                          }}
                        >
                          ✓ Sent (1/1)
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--mut)" }}>Available (0/1)</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "#ffffff" }}>
                        {user.totalAlertsReceived}
                      </span>{" "}
                      <span style={{ fontSize: "11px", color: "var(--mut)" }}>alerts</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {user.isOnlineNow ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "var(--lime)",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--lime)", boxShadow: "0 0 8px var(--lime)" }} />
                          Online Now
                        </span>
                      ) : (
                        <span style={{ color: "var(--mut)", fontSize: "12px" }}>Offline</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALERT RECEIVERS */}
      {activeTab === "alerts" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
                Active Alert Inboxes ({data.alertReceivers.length} Receiving Signals)
              </h3>
              <p style={{ fontSize: "13px", color: "var(--mut)" }}>
                Verified trader email destinations, subscribed strategy portfolios, and delivery counts.
              </p>
            </div>

            <div style={{ position: "relative", minWidth: "280px" }}>
              <input
                type="text"
                placeholder="Search destination email or strategy..."
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--mut)"
                strokeWidth="2"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>DESTINATION INBOX</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>SUBSCRIBED STRATEGIES</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>ALERT TYPES</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>DELIVERIES DISPATCHED</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>LAST DISPATCH</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlertReceivers.map((ar, idx) => (
                  <tr
                    key={ar.id || idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div className="mono" style={{ fontWeight: 600, color: "#ffffff" }}>
                        {ar.verifiedDestination}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--mut)", marginTop: "2px" }}>
                        User: {ar.userEmail}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {ar.strategiesList.map((sid) => (
                          <span
                            key={sid}
                            className="mono"
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "rgba(163, 230, 53, 0.1)",
                              color: "var(--lime)",
                              border: "1px solid rgba(163, 230, 53, 0.25)",
                            }}
                          >
                            {sid}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {ar.alertTypes.map((t) => (
                          <span
                            key={t}
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 600,
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "var(--mut)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--lime)", fontSize: "14px" }}>
                        {ar.totalAlertsReceived}
                      </span>{" "}
                      <span style={{ fontSize: "11px", color: "var(--mut)" }}>emails</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontSize: "12px", color: "var(--mut)" }}>
                        {ar.lastAlertReceivedAtFormatted}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: ar.enabled ? "rgba(163, 230, 53, 0.12)" : "rgba(255, 255, 255, 0.05)",
                          color: ar.enabled ? "var(--lime)" : "var(--mut)",
                          border: `1px solid ${ar.enabled ? "rgba(163, 230, 53, 0.3)" : "var(--line)"}`,
                        }}
                      >
                        {ar.enabled ? "ACTIVE" : "PAUSED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SIGNALS & DELIVERIES */}
      {activeTab === "signals" && (
        <div>
          {/* Strategy Distribution Grid */}
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "14px" }}>
            Signal Distribution per Strategy ({data.signalsTelemetry.byStrategy.length} Strategies)
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
              marginBottom: "32px",
            }}
          >
            {data.signalsTelemetry.byStrategy.map((s) => (
              <div
                key={s.strategyId}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span className="mono" style={{ fontSize: "14px", fontWeight: 800, color: "var(--lime)" }}>
                    {s.strategyId}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--mut)" }}>Last: {s.lastSignalTimeFormatted}</span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", marginBottom: "12px" }}>
                  {s.strategyName}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--mut)" }}>VPS SIGNALS</div>
                    <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                      {s.signalsCount}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--mut)" }}>EMAILS SENT</div>
                    <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>
                      {s.dispatchesCount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent VPS Ingested Signals Table */}
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "14px" }}>
            Recent VPS Ingested Signals
          </h3>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px", marginBottom: "32px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>SIGNAL ID & STRATEGY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>INSTRUMENT / TF</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>DIRECTION & ORDER</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>ENTRY / SL / TP</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>DISPATCHED TO</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {data.signalsTelemetry.recentSignals.map((sig, idx) => (
                  <tr
                    key={sig.id || idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div className="mono" style={{ fontWeight: 700, color: "var(--lime)" }}>
                        {sig.strategyId}
                      </div>
                      <div className="mono" style={{ fontSize: "11px", color: "var(--mut)", marginTop: "2px" }}>
                        {sig.id}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "#ffffff" }}>
                        {sig.instrument}
                      </span>{" "}
                      <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
                        {sig.timeframe}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: sig.direction === "LONG" ? "rgba(163, 230, 53, 0.12)" : "rgba(244, 63, 94, 0.12)",
                          color: sig.direction === "LONG" ? "var(--lime)" : "#f43f5e",
                          border: `1px solid ${sig.direction === "LONG" ? "rgba(163, 230, 53, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                        }}
                      >
                        {sig.direction} {sig.signalType}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="mono" style={{ fontSize: "12px", color: "#ffffff" }}>
                        Entry: {sig.entryPrice !== undefined ? sig.entryPrice : "Market"}
                      </div>
                      <div className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
                        SL: {sig.stopLoss || "Dynamic"} | TP: {sig.targetPrice || "Open"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "#38bdf8" }}>
                        {sig.dispatchedCount}
                      </span>{" "}
                      <span style={{ fontSize: "11px", color: "var(--mut)" }}>traders</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="mono" style={{ fontSize: "12px", color: "var(--lime)" }}>
                        {sig.timestampFormatted}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Email Deliveries Table */}
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "14px" }}>
            Recent Email Alert Dispatches
          </h3>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>DELIVERY ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>RECIPIENT INBOX</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>STRATEGY & ASSET</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--mut)" }}>DISPATCH TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {data.signalsTelemetry.recentDeliveries.map((del, idx) => (
                  <tr
                    key={del.id || idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontSize: "12px", color: "var(--mut)" }}>
                        {del.id}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontWeight: 600, color: "#ffffff" }}>
                        {del.recipientEmail}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--lime)" }}>
                        {del.strategyId}
                      </span>{" "}
                      <span className="mono" style={{ fontSize: "12px", color: "var(--mut)" }}>
                        {del.instrument} {del.direction}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: del.deliveryStatus === "SENT" ? "rgba(163, 230, 53, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          color: del.deliveryStatus === "SENT" ? "var(--lime)" : "#ef4444",
                          border: `1px solid ${del.deliveryStatus === "SENT" ? "rgba(163, 230, 53, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                        }}
                      >
                        {del.deliveryStatus}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="mono" style={{ fontSize: "12px", color: "var(--lime)" }}>
                        {del.sentAtFormatted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TRAFFIC & DWELL TIME */}
      {activeTab === "traffic" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            {/* Top Visited Pages */}
            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "20px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
                Top Visited Pages & Routes
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.traffic.topPages.map((page) => (
                  <div key={page.path}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span className="mono" style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                        {page.path}
                      </span>
                      <span className="mono" style={{ fontSize: "12px", color: "var(--lime)" }}>
                        {page.views} views ({page.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.max(4, page.percentage)}%`,
                          height: "100%",
                          background: "var(--lime)",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Distribution */}
            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "20px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
                Device Breakdown
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {data.traffic.devices.map((d) => (
                  <div key={d.device}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                        {d.device === "DESKTOP" ? "🖥️ Desktop" : d.device === "MOBILE" ? "📱 Mobile Device" : "📟 Tablet"}
                      </span>
                      <span className="mono" style={{ fontSize: "12px", color: "#38bdf8" }}>
                        {d.count} ({d.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.max(4, d.percentage)}%`,
                          height: "100%",
                          background: "#38bdf8",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginTop: "24px", marginBottom: "14px" }}>
                Browsers & Operating Systems
              </h4>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {data.traffic.browsers.map((b) => (
                  <span
                    key={b.browser}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                      color: "var(--mut)",
                    }}
                  >
                    {b.browser}: <strong style={{ color: "#ffffff" }}>{b.count}</strong>
                  </span>
                ))}
                {data.traffic.operatingSystems.map((os) => (
                  <span
                    key={os.os}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                      color: "var(--mut)",
                    }}
                  >
                    {os.os}: <strong style={{ color: "#ffffff" }}>{os.count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line)", borderRadius: "14px", padding: "20px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
                Geographic Terminal Origin
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.traffic.locations.map((loc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#ffffff", fontWeight: 600 }}>
                      🌍 {loc.city ? `${loc.city}, ` : ""}{loc.country}
                    </span>
                    <span className="mono" style={{ fontSize: "12px", color: "var(--lime)", fontWeight: 700 }}>
                      {loc.count} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
