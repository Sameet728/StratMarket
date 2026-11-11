"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { StratMarketLogo } from "@/components/StratMarketLogo";

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
  const [activeTab, setActiveTab] = useState<"ALL" | "PINE" | "ACTIVE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Email update state
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Test email state
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [testEmailSent, setTestEmailSent] = useState(false);

  // Alert toggle state
  const [updatingStrategy, setUpdatingStrategy] = useState<string | null>(null);

  // 1. Instant Cache Hydration: Read cached dashboard snapshot immediately (0ms)
  useEffect(() => {
    try {
      const cached = localStorage.getItem("stratmarket_dashboard_snapshot");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.user) {
          setUser(parsed.user);
          setEmailInput(parsed.user.email);
          if (Array.isArray(parsed.strategies)) setStrategies(parsed.strategies);
          if (Array.isArray(parsed.deliveries)) setDeliveries(parsed.deliveries);
          if (Array.isArray(parsed.trials)) setTrials(parsed.trials);
          if (Array.isArray(parsed.connections)) setConnections(parsed.connections);
          if (parsed.destinationEmail) setDestinationEmail(parsed.destinationEmail);
          if (parsed.testEmailSent !== undefined) setTestEmailSent(parsed.testEmailSent);
          setLoading(false);
        }
      }
    } catch (_) {}
  }, []);

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

        let reconciledStrategies: StrategyAlertItem[] = [];
        let fetchedDeliveries: any[] = [];
        let fetchedTrials: TrialItem[] = [];
        let fetchedConns: ConnectionItem[] = [];
        let finalDest = authData.user.email;
        let isTestSent = false;

        const alertsData = await alertsRes.json();
        if (alertsData.success) {
          let localAlertMap: Record<string, boolean> = {};
          try {
            const raw = localStorage.getItem("stratmarket_user_alerts_" + authData.user.id);
            if (raw) localAlertMap = JSON.parse(raw);
          } catch (_) {}

          const rawStrategies = alertsData.strategies || [];
          reconciledStrategies = rawStrategies.map((s: StrategyAlertItem) => {
            const localVal =
              localAlertMap[s.id] !== undefined
                ? localAlertMap[s.id]
                : localAlertMap[s.slug] !== undefined
                ? localAlertMap[s.slug]
                : undefined;
            const isEnabled = localVal !== undefined ? (s.enabled || localVal) : s.enabled;
            return {
              ...s,
              enabled: isEnabled,
            };
          });

          try {
            const synced: Record<string, boolean> = { ...localAlertMap };
            reconciledStrategies.forEach((s: StrategyAlertItem) => {
              synced[s.id] = s.enabled;
              synced[s.slug] = s.enabled;
            });
            localStorage.setItem("stratmarket_user_alerts_" + authData.user.id, JSON.stringify(synced));
          } catch (_) {}

          setStrategies(reconciledStrategies);
          fetchedDeliveries = alertsData.deliveries || [];
          setDeliveries(fetchedDeliveries);
          if (alertsData.testEmailSent) {
            isTestSent = true;
            setTestEmailSent(true);
          }
          finalDest = alertsData.destinationEmail || authData.user.email;
          setDestinationEmail(finalDest);
          setEmailInput(finalDest);
        }

        const entData = await entRes.json();
        if (entData.success) {
          fetchedTrials = entData.trials || [];
          setTrials(fetchedTrials);
        }

        const connData = await connRes.json();
        if (connData.success) {
          fetchedConns = connData.connections || [];
          setConnections(fetchedConns);
        }

        // Cache dashboard snapshot for instant 0ms restoration
        try {
          localStorage.setItem(
            "stratmarket_dashboard_snapshot",
            JSON.stringify({
              user: authData.user,
              strategies: reconciledStrategies,
              deliveries: fetchedDeliveries,
              trials: fetchedTrials,
              connections: fetchedConns,
              destinationEmail: finalDest,
              testEmailSent: isTestSent,
            })
          );
        } catch (_) {}
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

    // Optimistically update UI immediately
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

    // Persist immediately in client-side storage for refresh durability
    try {
      const storageKey = "stratmarket_user_alerts_" + (user?.id || "default");
      const raw = localStorage.getItem(storageKey);
      const currentMap = raw ? JSON.parse(raw) : {};
      currentMap[strategy.id] = newEnabled;
      currentMap[strategy.slug] = newEnabled;
      currentMap[strategy.id.toUpperCase()] = newEnabled;
      currentMap[strategy.slug.toLowerCase()] = newEnabled;
      localStorage.setItem(storageKey, JSON.stringify(currentMap));
    } catch (_) {}

    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: strategy.id,
          enabled: newEnabled,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
          destinationEmail: destinationEmail || user?.email,
        }),
      });

      if (res.ok) {
        if (newEnabled) {
          toast.success("Signal Alerts Active", `${strategy.name} alerts are now active for your account.`);
        } else {
          toast.info("Signal Alerts Paused", `${strategy.name} alerts have been paused.`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error("Alert Update Failed", errData.error || "Failed to update alert preference. Please try again.");
        // Revert on failure
        setStrategies((prev) =>
          prev.map((s) => (s.id === strategy.id ? { ...s, enabled: strategy.enabled } : s))
        );
        try {
          const storageKey = "stratmarket_user_alerts_" + (user?.id || "default");
          const raw = localStorage.getItem(storageKey);
          const currentMap = raw ? JSON.parse(raw) : {};
          currentMap[strategy.id] = strategy.enabled;
          currentMap[strategy.slug] = strategy.enabled;
          localStorage.setItem(storageKey, JSON.stringify(currentMap));
        } catch (_) {}
      }
    } catch (err) {
      console.error("Toggle alert error:", err);
      toast.error("Network Error", "Could not reach alert notification service.");
      setStrategies((prev) =>
        prev.map((s) => (s.id === strategy.id ? { ...s, enabled: strategy.enabled } : s))
      );
      try {
        const storageKey = "stratmarket_user_alerts_" + (user?.id || "default");
        const raw = localStorage.getItem(storageKey);
        const currentMap = raw ? JSON.parse(raw) : {};
        currentMap[strategy.id] = strategy.enabled;
        currentMap[strategy.slug] = strategy.enabled;
        localStorage.setItem(storageKey, JSON.stringify(currentMap));
      } catch (_) {}
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
        toast.success("Destination Updated", `Trade notifications will now be routed to ${emailInput.trim()}`);
        setTimeout(() => setEmailMessage(null), 4000);
      } else {
        setEmailMessage({ text: data.error || "Failed to update email.", ok: false });
        toast.error("Update Failed", data.error || "Failed to update notification email.");
      }
    } catch {
      setEmailMessage({ text: "Network error saving email.", ok: false });
      toast.error("Network Error", "Could not save notification email destination.");
    } finally {
      setSavingEmail(false);
    }
  };

  // Send sample test signal to destination email
  const handleSendTestSignal = async () => {
    if (testEmailSent) {
      setTestResult({
        text: "You have already sent your verification test email (maximum 1 allowed per user).",
        ok: false,
      });
      toast.warning("Test Quota Reached", "Maximum 1 verification test email allowed per registered account.");
      return;
    }
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
        setTestEmailSent(true);
        setTestResult({
          text: `Sample verification test signal sent to ${destinationEmail || user?.email}! Check your inbox. (Limit: 1/1 test email used)`,
          ok: true,
        });
        toast.success(
          "Test Signal Dispatched",
          `Verification alert delivered to ${destinationEmail || user?.email}! (1/1 test used)`
        );
      } else {
        if (data.alreadySent) setTestEmailSent(true);
        setTestResult({ text: data.error || "Failed to dispatch test signal.", ok: false });
        if (data.alreadySent) {
          toast.warning("Test Quota Reached", "Max 1 test email limit per user has already been reached.");
        } else {
          toast.error("Dispatch Failed", data.error || "Failed to dispatch test signal.");
        }
      }
    } catch {
      setTestResult({ text: "Network error sending test signal.", ok: false });
      toast.error("Network Error", "Could not dispatch sample verification signal.");
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
      if (res.ok && data.success) {
        setConnections((prev) => {
          const filtered = prev.filter((c) => c.brokerIdentifier !== "PAPER_SIMULATOR");
          return [...filtered, data.connection];
        });
      } else {
        alert(data.error || "Failed to launch virtual paper simulator.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="wrap dashboard-wrap" style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            width: 36,
            height: 36,
            border: "2px solid var(--line)",
            borderTopColor: "#ffffff",
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
  const activeTrialsCount = strategies.filter((s) => s.trialStatus === "ACTIVE").length;

  return (
    <div className="wrap dashboard-wrap">
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
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(163, 230, 53, 0.06)",
                border: "1px solid rgba(163, 230, 53, 0.3)",
                color: "#ffffff",
                maxWidth: "100%",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#a3e635",
                  boxShadow: "0 0 8px #a3e635",
                }}
              />
              Live Quant Signals Active · VPS Connected
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(24px, 5.5vw, 32px)", margin: "10px 0 0", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <StratMarketLogo size={28} color="#ffffff" />
            <span>Trading Dashboard</span>
          </h1>
          <p className="note" style={{ fontSize: 13, marginTop: 4 }}>
            Logged in as <b>{user?.name}</b> ({user?.email}) ·{" "}
            <span style={{ color: "#a3e635" }}>Institutional Execution Feed</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/profile" className="pill g sm" style={{ fontSize: 13 }}>
            Profile &amp; Settings
          </Link>
          <Link href="/market" className="pill lime sm" style={{ fontSize: 13 }}>
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
          <div style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", fontFamily: "'JetBrains Mono', monospace" }}>
            {strategies.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Available Strategies</div>
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--lime, #a3e635)", fontFamily: "'JetBrains Mono', monospace" }}>
            {activeAlertsCount} / {strategies.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Signal Alerts Enabled</div>
        </div>

        <Link
          href="/profile"
          style={{
            display: "block",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
            textDecoration: "none",
            transition: "border-color 0.2s ease, background 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", fontFamily: "'JetBrains Mono', monospace" }}>
              {deliveries.length}
            </div>
            <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600 }}>Audit History ↗</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>Signals Delivered</div>
        </Link>

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
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(10, 10, 10, 0.4) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 15, color: "#f8fafc" }}>Signal Notification Delivery Inbox</strong>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                Institutional Gateway • Domain: elvariscapital.in
              </span>
            </div>
            <p className="note" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Live Entry, Stop Loss, and Take Profit signals from Pine Script engines dispatch straight to this inbox.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleSendTestSignal}
              disabled={sendingTest || testEmailSent}
              className={`pill ${testEmailSent ? "d" : "g"} sm`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                touchAction: "manipulation",
                opacity: testEmailSent ? 0.6 : 1,
                cursor: testEmailSent ? "not-allowed" : "pointer",
              }}
              title={testEmailSent ? "Test email has already been sent (limit: 1 per user)" : "Send a verification test email"}
            >
              {sendingTest ? "Sending..." : testEmailSent ? "✓ Test Email Sent (1/1)" : "Send Test Signal"}
            </button>
            <button
              type="button"
              onClick={() => setEditingEmail(!editingEmail)}
              className="pill sm"
              style={{ fontSize: 12, fontWeight: 600, touchAction: "manipulation" }}
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
                type="button"
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="pill sm"
                style={{ fontSize: 12, padding: "0 18px", touchAction: "manipulation" }}
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
                color: emailMessage.ok ? "#ffffff" : "#ef4444",
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
                color: testResult.ok ? "#ffffff" : "#ef4444",
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
              Toggle real-time email trade alerts and open live candlestick charts for Pine Script strategies.
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
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`pill ${activeTab === "ALL" ? "" : "g"} sm`}
            style={{ fontSize: 12, touchAction: "manipulation" }}
          >
            All Pine Script Strategies ({strategies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`pill ${activeTab === "ACTIVE" ? "" : "g"} sm`}
            style={{
              fontSize: 12,
              touchAction: "manipulation",
              color: activeAlertsCount > 0 ? "#ffffff" : undefined,
            }}
          >
            Active Signals ({activeAlertsCount})
          </button>
        </div>
      </div>

      {/* 5. Strategy Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
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
            type="button"
            onClick={connectSimulator}
            className="pill g sm"
            style={{ fontSize: 12, fontWeight: 600, touchAction: "manipulation" }}
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
            No broker connections active. Connect your broker or Paper Simulator to route signals automatically.
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
          ? "1px solid rgba(255, 255, 255, 0.1)"
          : "1px solid var(--line)",
        borderRadius: 14,
        padding: "20px",
        background: strategy.enabled
          ? "linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(10, 10, 10, 0.4) 100%)"
          : "rgba(255,255,255,0.015)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.25s ease",
        boxShadow: strategy.enabled ? "0 4px 20px rgba(255, 255, 255, 0.1)" : "none",
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
                background: isPine ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {isPine ? "PINE SCRIPT v5" : "QUANT ALGO"}
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

          {/* Access Badge */}
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: "rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              Free Access
            </span>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--lime, #a3e635)", fontFamily: "'JetBrains Mono', monospace" }}>
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
          <button
            type="button"
            onClick={onToggleAlert}
            disabled={updating}
            style={{
              width: "100%",
              padding: "9px 14px",
              borderRadius: 8,
              border: strategy.enabled
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid var(--line)",
              background: strategy.enabled
                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.15) 100%)"
                : "rgba(255,255,255,0.03)",
              color: strategy.enabled ? "#ffffff" : "var(--mut)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              touchAction: "manipulation",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.2s",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: strategy.enabled ? "#ffffff" : "var(--mut)" }}>●</span>
              <span>
                {updating
                  ? (strategy.enabled ? "Saving Active..." : "Saving...")
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
                background: strategy.enabled ? "rgba(255, 255, 255, 0.1)" : "rgba(255,255,255,0.06)",
                color: strategy.enabled ? "#fff" : "var(--mut)",
              }}
            >
              {strategy.enabled ? "● ON" : "○ OFF"}
            </span>
          </button>
        </div>

        {/* Action Buttons: Live Chart & Performance Report */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Link
            href={`/chart/${strategy.id}`}
            className="pill g sm"
            style={{
              padding: "8px 10px",
              borderRadius: 8,
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
            Live Chart ↗
          </Link>

          <Link
            href={`/strategies/${strategy.slug}`}
            className="pill g sm"
            style={{
              padding: "8px 10px",
              borderRadius: 8,
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
            View Report ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
