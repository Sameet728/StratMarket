"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TrialItem {
  id: string;
  strategyId: string;
  strategyName: string;
  instrument: string;
  timeframe: string;
  category: string;
  status: string;
  startTime: string;
  expiryTime: string;
  daysLeft: number;
  isExpired: boolean;
}

interface StrategyAlertItem {
  id: string;
  slug: string;
  name: string;
  type: "PINE_SCRIPT" | "PYTHON";
  instrument: string;
  timeframe: string;
  winRate: number;
  profitFactor: number;
  netReturn: number;
  maxDrawdown: number;
  enabled: boolean;
  hasAccess: boolean;
  hasPaid: boolean;
  trialStatus: "ACTIVE" | "EXPIRED" | "NOT_STARTED";
  daysLeft: number;
  expiryTime?: string;
  chartUrl: string;
  reportUrl: string;
}

interface DeliveryItem {
  id: string;
  signalId: string;
  deliveryStatus: string;
  sentAt?: string;
  providerMessageRef?: string;
}

interface ConnectionItem {
  id: string;
  brokerIdentifier: string;
  connectionStatus: string;
  grantedScopes: string[];
  isLive: boolean;
}

function useCountdown(expiryTime?: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!expiryTime) {
      setTimeLeft("");
      return;
    }
    const tick = () => {
      const diff = new Date(expiryTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) {
        setTimeLeft(`${d}d ${h}h ${m}m`);
      } else {
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryTime]);

  return timeLeft;
}

export function DashboardClient() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [strategies, setStrategies] = useState<StrategyAlertItem[]>([]);
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [destinationEmail, setDestinationEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter state
  const [activeTab, setActiveTab] = useState<"ALL" | "PINE" | "PYTHON" | "ACTIVE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Email update state
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Test email state
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; ok: boolean } | null>(null);

  // Alert toggle state
  const [updatingStrategy, setUpdatingStrategy] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();
        if (!authData.authenticated || !authData.user) {
          router.push("/signin");
          return;
        }
        setUser(authData.user);
        setEmailInput(authData.user.email);

        const [alertsRes, entRes, connRes] = await Promise.all([
          fetch("/api/me/alerts"),
          fetch("/api/me/entitlements"),
          fetch("/api/me/connections"),
        ]);

        const alertsData = await alertsRes.json();
        if (alertsData.success) {
          setStrategies(alertsData.strategies || []);
          setDeliveries(alertsData.deliveries || []);
          const dest = alertsData.destinationEmail || authData.user.email;
          setDestinationEmail(dest);
          setEmailInput(dest);
        }

        const entData = await entRes.json();
        if (entData.success) {
          setTrials(entData.trials || []);
        }

        const connData = await connRes.json();
        if (connData.success) {
          setConnections(connData.connections || []);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Toggle individual strategy alert
  const toggleAlert = async (strategy: StrategyAlertItem) => {
    setUpdatingStrategy(strategy.id);
    const newEnabled = !strategy.enabled;

    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: strategy.id,
          enabled: newEnabled,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
          destinationEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStrategies((prev) =>
          prev.map((s) => {
            if (s.id === strategy.id) {
              const trialStatus = s.trialStatus === "NOT_STARTED" && newEnabled ? "ACTIVE" : s.trialStatus;
              return {
                ...s,
                enabled: newEnabled,
                trialStatus,
                hasAccess: true,
                daysLeft: s.daysLeft === 0 && newEnabled ? 7 : s.daysLeft,
              };
            }
            return s;
          })
        );
      }
    } catch (err) {
      console.error("Toggle alert error:", err);
    } finally {
      setUpdatingStrategy(null);
    }
  };

  // Save new destination email
  const handleSaveEmail = async () => {
    if (!/^\S+@\S+\.\S+$/.test(emailInput)) {
      setEmailMessage({ text: "Please enter a valid email address.", ok: false });
      return;
    }
    setSavingEmail(true);
    setEmailMessage(null);
    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_EMAIL", email: emailInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDestinationEmail(emailInput.trim());
        setEditingEmail(false);
        setEmailMessage({ text: "Notification email updated across all strategies!", ok: true });
        setTimeout(() => setEmailMessage(null), 4000);
      } else {
        setEmailMessage({ text: data.error || "Failed to update email.", ok: false });
      }
    } catch {
      setEmailMessage({ text: "Network error saving email.", ok: false });
    } finally {
      setSavingEmail(false);
    }
  };

  // Send sample test signal to destination email
  const handleSendTestSignal = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/me/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: destinationEmail || user?.email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          text: `Sample signal sent to ${destinationEmail || user?.email}! Check your inbox.`,
          ok: true,
        });
      } else {
        setTestResult({ text: data.error || "Failed to dispatch test signal.", ok: false });
      }
    } catch {
      setTestResult({ text: "Network error sending test signal.", ok: false });
    } finally {
      setSendingTest(false);
    }
  };

  const connectSimulator = async () => {
    try {
      const res = await fetch("/api/me/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerIdentifier: "PAPER_SIMULATOR",
          grantedScopes: ["READ_ONLY", "TRADE_EXECUTION"],
          isLive: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnections((prev) => {
          const filtered = prev.filter((c) => c.brokerIdentifier !== "PAPER_SIMULATOR");
          return [...filtered, data.connection];
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="wrap" style={{ padding: "120px 24px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            width: 36,
            height: 36,
            border: "2px solid var(--line)",
            borderTopColor: "#10b981",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p className="note" style={{ marginTop: 16 }}>Loading your StratMarket institutional trading hub...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Filter strategies
  const filteredStrategies = strategies.filter((s) => {
    const matchesTab =
      activeTab === "ALL" ||
      (activeTab === "PINE" && s.type === "PINE_SCRIPT") ||
      (activeTab === "PYTHON" && s.type === "PYTHON") ||
      (activeTab === "ACTIVE" && s.enabled);

    const matchesSearch =
      !searchTerm.trim() ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.instrument.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const activeAlertsCount = strategies.filter((s) => s.enabled).length;
  const pineCount = strategies.filter((s) => s.type === "PINE_SCRIPT").length;
  const pythonCount = strategies.filter((s) => s.type === "PYTHON").length;
  const activeTrialsCount = strategies.filter((s) => s.trialStatus === "ACTIVE").length;

  return (
    <div className="wrap" style={{ padding: "90px 24px 80px", maxWidth: 1280, margin: "0 auto" }}>
      {/* 1. Header Bar */}
      <div
        style={{
          borderBottom: "1px solid var(--line)",
          paddingBottom: 24,
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#10b981",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              Live Quant Signals Active · VPS Connected
            </span>
          </div>

          <h1 style={{ fontSize: 32, margin: "10px 0 0", fontWeight: 800 }}>
            Trading Dashboard
          </h1>
          <p className="note" style={{ fontSize: 13, marginTop: 4 }}>
            Logged in as <b>{user?.name}</b> ({user?.email}) ·{" "}
            <span style={{ color: "#38bdf8" }}>Institutional Execution Feed</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/profile" className="pill g sm" style={{ fontSize: 13 }}>
            ⚙️ Profile &amp; Settings
          </Link>
          <Link href="/market" className="pill sm" style={{ fontSize: 13 }}>
            Explore All Strategies →
          </Link>
        </div>
      </div>

      {/* 2. Master Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>
            {activeTrialsCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Active 7-Day Trials</div>
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "#38bdf8", fontFamily: "'JetBrains Mono', monospace" }}>
            {activeAlertsCount} / {strategies.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Signal Alerts Enabled</div>
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }}>
            {deliveries.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Signals Delivered</div>
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace" }}>
            {connections.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Active Broker Relays</div>
        </div>
      </div>

      {/* 3. Master Signal Notification Destination Banner */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          marginBottom: 32,
          borderRadius: 14,
          border: "1px solid rgba(56, 189, 248, 0.25)",
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📬</span>
              <strong style={{ fontSize: 15, color: "#f8fafc" }}>Signal Notification Delivery Inbox</strong>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(16,185,129,0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                Resend Verified Domain: elvariscapital.in
              </span>
            </div>
            <p className="note" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Live Entry, Stop Loss, and Take Profit signals from MT5 VPS and Pine Script engines dispatch straight to this inbox.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleSendTestSignal}
              disabled={sendingTest}
              className="pill g sm"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {sendingTest ? "Sending..." : "✉️ Send Test Signal"}
            </button>
            <button
              onClick={() => setEditingEmail(!editingEmail)}
              className="pill sm"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {editingEmail ? "Cancel" : "Change Inbox"}
            </button>
          </div>
        </div>

        {/* Current Destination Display or Input */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {editingEmail ? (
            <div style={{ display: "flex", gap: 10, maxWidth: 500 }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="trader@yourdomain.com"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--tx)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="pill sm"
                style={{ fontSize: 12, padding: "0 18px" }}
              >
                {savingEmail ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--mut)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Signals delivering to:</span>
              <code style={{ fontSize: 13, color: "#38bdf8", fontWeight: 700 }}>
                {destinationEmail || user?.email}
              </code>
            </div>
          )}

          {emailMessage && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: emailMessage.ok ? "#10b981" : "#ef4444",
              }}
            >
              {emailMessage.ok ? "✓ " : "✕ "}
              {emailMessage.text}
            </div>
          )}

          {testResult && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: testResult.ok ? "#10b981" : "#ef4444",
              }}
            >
              {testResult.ok ? "✓ " : "✕ "}
              {testResult.text}
            </div>
          )}
        </div>
      </div>

      {/* 4. Strategy Alert Controls Section */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>
              Live Strategy Signals &amp; Alert Feeds
            </h2>
            <p className="note" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Toggle real-time email trade alerts and open live candlestick charts for both Pine Script and Python strategies.
            </p>
          </div>

          {/* Search Input */}
          <div style={{ minWidth: 240 }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by strategy or symbol (e.g. XAUUSD)..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--tx)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`pill ${activeTab === "ALL" ? "" : "g"} sm`}
            style={{ fontSize: 12 }}
          >
            All Strategies ({strategies.length})
          </button>
          <button
            onClick={() => setActiveTab("PINE")}
            className={`pill ${activeTab === "PINE" ? "" : "g"} sm`}
            style={{
              fontSize: 12,
              background: activeTab === "PINE" ? "rgba(16,185,129,0.2)" : undefined,
              borderColor: activeTab === "PINE" ? "#10b981" : undefined,
              color: activeTab === "PINE" ? "#4ade80" : undefined,
            }}
          >
            🌲 Pine Script Strategies ({pineCount})
          </button>
          <button
            onClick={() => setActiveTab("PYTHON")}
            className={`pill ${activeTab === "PYTHON" ? "" : "g"} sm`}
            style={{
              fontSize: 12,
              background: activeTab === "PYTHON" ? "rgba(234,179,8,0.2)" : undefined,
              borderColor: activeTab === "PYTHON" ? "#eab308" : undefined,
              color: activeTab === "PYTHON" ? "#fde047" : undefined,
            }}
          >
            🐍 Python MT5 Ensembles ({pythonCount})
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`pill ${activeTab === "ACTIVE" ? "" : "g"} sm`}
            style={{
              fontSize: 12,
              color: activeAlertsCount > 0 ? "#38bdf8" : undefined,
            }}
          >
            🔔 Active Alerts ({activeAlertsCount})
          </button>
        </div>
      </div>

      {/* 5. Strategy Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 18,
          marginBottom: 40,
        }}
      >
        {filteredStrategies.map((strategy) => (
          <StrategyDashboardCard
            key={strategy.id}
            strategy={strategy}
            updating={updatingStrategy === strategy.id}
            onToggleAlert={() => toggleAlert(strategy)}
          />
        ))}
      </div>

      {/* 6. Trading Connections & Execution Gate */}
      <div
        className="card"
        style={{
          padding: 24,
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>Trading Connections &amp; Execution Relays</h3>
            <p className="note" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Connect low-latency MetaTrader 5 execution accounts or deploy a zero-risk Virtual Paper Simulator.
            </p>
          </div>
          <button
            onClick={connectSimulator}
            className="pill g sm"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            + Connect Paper Simulator
          </button>
        </div>

        {connections.length > 0 ? (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {connections.map((c) => (
              <div
                key={c.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  background: "var(--bg)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <b style={{ fontSize: 14 }}>{c.brokerIdentifier}</b>
                  <div className="note" style={{ fontSize: 12, marginTop: 2 }}>
                    Status: {c.connectionStatus} · Scopes: {c.grantedScopes.join(", ")}
                  </div>
                </div>
                <span className="badge py" style={{ fontSize: 11 }}>Active Relay</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ margin: "16px 0", fontSize: 13 }}>
            No broker connections active. Connect your MT5 or Paper Simulator to route signals automatically.
          </div>
        )}
      </div>
    </div>
  );
}

function StrategyDashboardCard({
  strategy,
  updating,
  onToggleAlert,
}: {
  strategy: StrategyAlertItem;
  updating: boolean;
  onToggleAlert: () => void;
}) {
  const isPine = strategy.type === "PINE_SCRIPT";
  const countdown = useCountdown(strategy.expiryTime);

  return (
    <div
      style={{
        border: strategy.enabled
          ? "1px solid rgba(16, 185, 129, 0.4)"
          : "1px solid var(--line)",
        borderRadius: 14,
        padding: "20px",
        background: strategy.enabled
          ? "linear-gradient(145deg, rgba(16, 185, 129, 0.04) 0%, rgba(15, 23, 42, 0.3) 100%)"
          : "rgba(255,255,255,0.015)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.25s ease",
        boxShadow: strategy.enabled ? "0 4px 20px rgba(16, 185, 129, 0.08)" : "none",
      }}
    >
      <div>
        {/* Top Badges Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: isPine ? "rgba(76, 199, 154, 0.15)" : "rgba(234, 179, 8, 0.15)",
                color: isPine ? "#4ade80" : "#fde047",
                border: isPine ? "1px solid rgba(76, 199, 154, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
              }}
            >
              {isPine ? "🌲 PINE SCRIPT v5" : "🐍 PYTHON MT5"}
            </span>

            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                color: "var(--mut)",
              }}
            >
              {strategy.instrument} · {strategy.timeframe}
            </span>
          </div>

          {/* Access / Trial Badge */}
          <div>
            {strategy.hasPaid ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#c084fc",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                }}
              >
                💎 Pro Active
              </span>
            ) : strategy.trialStatus === "ACTIVE" ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                ⏱️ Trial: {countdown || `${strategy.daysLeft}d left`}
              </span>
            ) : strategy.trialStatus === "EXPIRED" ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                🔒 Trial Expired
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(56, 189, 248, 0.1)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                }}
              >
                ⚡ 7-Day Trial Available
              </span>
            )}
          </div>
        </div>

        {/* Strategy Title */}
        <h3 style={{ fontSize: 18, margin: "0 0 6px", fontWeight: 800, color: "#fff" }}>
          {strategy.name}{" "}
          <span style={{ fontSize: 13, color: "var(--mut)", fontWeight: 400 }}>({strategy.id})</span>
        </h3>

        {/* Core Institutional Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            padding: "10px 12px",
            background: "rgba(0,0,0,0.25)",
            borderRadius: 8,
            border: "1px solid var(--line)",
            margin: "12px 0 16px",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>Win Rate</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
              {strategy.winRate}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>Profit Factor</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
              {strategy.profitFactor}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>Max DD</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", fontFamily: "'JetBrains Mono', monospace" }}>
              {strategy.maxDrawdown}%
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div>
        {/* Email Alerts Toggle Switch */}
        <div style={{ marginBottom: 12 }}>
          {strategy.trialStatus === "EXPIRED" && !strategy.hasPaid ? (
            <Link
              href="/pricing"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              🔒 7-Day Trial Ended · Upgrade to Re-enable Alerts →
            </Link>
          ) : (
            <button
              onClick={onToggleAlert}
              disabled={updating}
              style={{
                width: "100%",
                padding: "9px 14px",
                borderRadius: 8,
                border: strategy.enabled
                  ? "1px solid rgba(16, 185, 129, 0.5)"
                  : "1px solid var(--line)",
                background: strategy.enabled
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.25) 100%)"
                  : "rgba(255,255,255,0.03)",
                color: strategy.enabled ? "#10b981" : "var(--mut)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{strategy.enabled ? "🔔" : "🔕"}</span>
                <span>
                  {updating
                    ? "Updating..."
                    : strategy.enabled
                    ? "Email Alerts Active"
                    : "Turn Alerts ON"}
                </span>
              </span>

              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: strategy.enabled ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)",
                  color: strategy.enabled ? "#fff" : "var(--mut)",
                }}
              >
                {strategy.enabled ? "● ON" : "○ OFF"}
              </span>
            </button>
          )}
        </div>

        {/* Action Buttons: Live Chart & Performance Report */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Link
            href={strategy.chartUrl}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(56, 189, 248, 0.3)",
              background: "rgba(56, 189, 248, 0.08)",
              color: "#38bdf8",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>📈</span>
            <span>Open Chart</span>
          </Link>

          <Link
            href={strategy.reportUrl}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--tx)",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>📊</span>
            <span>Tear Sheet</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
