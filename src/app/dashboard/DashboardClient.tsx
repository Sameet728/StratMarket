"use client";

import { useEffect, useState, useRef } from "react";
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

interface AlertPref {
  id: string;
  strategyId: string;
  enabled: boolean;
  alertTypes: string[];
  verifiedDestination?: string;
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

function useCountdown(expiryTime: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
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

function TrialCard({ trial, onBuy }: { trial: TrialItem; onBuy: () => void }) {
  const countdown = useCountdown(trial.expiryTime);
  const msLeft = new Date(trial.expiryTime).getTime() - Date.now();
  const hoursLeft = msLeft / 3600000;
  const isUrgent = hoursLeft < 48 && !trial.isExpired;
  const isWarning = hoursLeft < 96 && hoursLeft >= 48 && !trial.isExpired;

  return (
    <div
      style={{
        border: `1px solid ${isUrgent ? "rgba(239,68,68,0.4)" : isWarning ? "rgba(251,191,36,0.3)" : "var(--line)"}`,
        borderRadius: 12,
        padding: 16,
        background: isUrgent
          ? "rgba(239,68,68,0.04)"
          : isWarning
          ? "rgba(251,191,36,0.03)"
          : "var(--bg)",
        transition: "border-color 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{trial.strategyName}</div>
          <div className="note" style={{ marginTop: 3, fontSize: 12 }}>
            {trial.strategyId} · {trial.instrument} · {trial.timeframe} · {trial.category}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: isUrgent ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981",
            }}
          >
            {countdown}
          </div>
          <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>remaining</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 8 }}>
        Expires {new Date(trial.expiryTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at{" "}
        {new Date(trial.expiryTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </div>

      {isUrgent && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, color: "#f87171" }}>⚠️ Trial ending soon — upgrade to keep access</span>
          <button
            onClick={onBuy}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            View Plans →
          </button>
        </div>
      )}

      {isWarning && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.2)",
            fontSize: 12,
            color: "#fbbf24",
          }}
        >
          ⏳ Less than 4 days left — consider subscribing to continue receiving signals.
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Link
          href={`/chart/${trial.strategyId.toLowerCase()}`}
          className="pill g sm"
          style={{ fontSize: 12, padding: "5px 12px" }}
        >
          Open Chart →
        </Link>
        <Link
          href={`/strategies/${trial.strategyId.toLowerCase()}`}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            fontSize: 12,
            color: "var(--mut)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Performance Report
        </Link>
      </div>
    </div>
  );
}

function SignalEmailForm({ user }: { user: UserProfile }) {
  const [signalEmail, setSignalEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!/^\S+@\S+\.\S+$/.test(signalEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // Store preference via alerts endpoint
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: "ALL",
          enabled: true,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
          verifiedDestination: signalEmail,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError("Failed to save. Please try again.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: "14px 16px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Signal Delivery Email
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="email"
          value={signalEmail}
          onChange={(e) => {
            setSignalEmail(e.target.value);
            setSaved(false);
            setError("");
          }}
          placeholder="your@email.com"
          style={{
            flex: 1,
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--tx)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: saved ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
            color: saved ? "#10b981" : "var(--tx)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save"}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{error}</div>}
      <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 6 }}>
        Live trade signals (Entry, TP hit, SL hit) will be sent to this address from <code style={{ fontSize: 11 }}>signals@elvariscapital.in</code>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [alerts, setAlerts] = useState<AlertPref[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAlert, setUpdatingAlert] = useState<string | null>(null);
  const router = useRouter();

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

        const [entRes, alertRes, connRes] = await Promise.all([
          fetch("/api/me/entitlements"),
          fetch("/api/me/alerts"),
          fetch("/api/me/connections"),
        ]);

        const entData = await entRes.json();
        if (entData.success) {
          setTrials(entData.trials || []);
        }

        const alertData = await alertRes.json();
        if (alertData.success) {
          setAlerts(alertData.preferences || []);
          setDeliveries(alertData.deliveries || []);
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

  const toggleAlert = async (strategyId: string, currentEnabled: boolean) => {
    setUpdatingAlert(strategyId);
    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          enabled: !currentEnabled,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) =>
          prev.map((a) => (a.strategyId === strategyId ? { ...a, enabled: !currentEnabled } : a))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAlert(null);
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/signin");
  };

  if (loading) {
    return (
      <div className="wrap" style={{ padding: "120px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 32, height: 32, border: "2px solid var(--line)", borderTopColor: "var(--tx)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p className="note" style={{ marginTop: 16 }}>Loading your trading dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeTrials = trials.filter((t) => !t.isExpired && t.status === "ACTIVE");
  const expiredTrials = trials.filter((t) => t.isExpired || t.status === "EXPIRED");

  // Check for urgently expiring trials (< 48 hours)
  const urgentTrials = activeTrials.filter((t) => {
    const msLeft = new Date(t.expiryTime).getTime() - Date.now();
    return msLeft < 48 * 3600 * 1000;
  });

  return (
    <div className="wrap" style={{ padding: "100px 24px 80px" }}>
      {/* User Header */}
      <div
        style={{
          borderBottom: "1px solid var(--line)",
          paddingBottom: 24,
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <span className="badge py">Trader Account</span>
          <h1 style={{ fontSize: 34, marginTop: 8 }}>
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="note" style={{ fontSize: 13, marginTop: 4 }}>
            {user?.email} · Role: {user?.role}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/profile" className="pill g sm" style={{ fontSize: 13 }}>
            ⚙️ Profile & Signal Email
          </Link>
          <Link href="/market" className="pill sm">
            + Explore Strategies
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "none",
              color: "var(--mut)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Urgent Expiry Banner */}
      {urgentTrials.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            padding: "14px 20px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#f87171", fontSize: 14 }}>
              ⚠️ {urgentTrials.length === 1 ? "1 trial" : `${urgentTrials.length} trials`} expiring in less than 48 hours
            </div>
            <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 3 }}>
              {urgentTrials.map(t => t.strategyName).join(", ")} — upgrade now to avoid losing signal access
            </div>
          </div>
          <Link
            href="/pricing"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "#ef4444",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              display: "inline-block",
              flexShrink: 0,
            }}
          >
            View Subscription Plans →
          </Link>
        </div>
      )}

      {/* Stats Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          { label: "Active Trials", value: activeTrials.length, color: "#10b981" },
          { label: "Signal Alerts", value: alerts.filter(a => a.enabled).length, color: "#38bdf8" },
          { label: "Signals Delivered", value: deliveries.length, color: "#fbbf24" },
          { label: "Connections", value: connections.length, color: "#a78bfa" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--bg2)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>

        {/* Active Trials Panel */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontSize: 17 }}>Active 7-Day Trials</h3>
            <span style={{ fontSize: 12, color: "var(--mut)" }}>{activeTrials.length} active</span>
          </div>
          <p className="note" style={{ fontSize: 13, marginBottom: 16 }}>
            Live countdown timers showing exact time remaining.
          </p>

          {activeTrials.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {activeTrials.map((t) => (
                <TrialCard
                  key={t.id}
                  trial={t}
                  onBuy={() => router.push("/pricing")}
                />
              ))}
            </div>
          ) : (
            <div className="empty" style={{ margin: "16px 0" }}>
              No active trials. Browse the marketplace to activate a free 7-day trial on any strategy.
              <div style={{ marginTop: 12 }}>
                <Link href="/market" className="pill g sm">
                  Browse Strategies →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Email Signal Preferences Panel */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontSize: 17 }}>Email Signal Alerts</h3>
            <span style={{ fontSize: 12, background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(16,185,129,0.2)" }}>
              VPS Live
            </span>
          </div>
          <p className="note" style={{ fontSize: 13, marginBottom: 0 }}>
            Real-time signals generated by the Elvaris quant VPS — Entry, TP hit, SL hit.
          </p>

          {user && <SignalEmailForm user={user} />}

          <div style={{ marginTop: 16 }}>
            {alerts.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      background: "var(--bg)",
                    }}
                  >
                    <div>
                      <b style={{ fontSize: 14 }}>{a.strategyId}</b>
                      <div className="note" style={{ fontSize: 12 }}>Entry · Exit · SL · TP</div>
                    </div>
                    <button
                      className={`chip ${a.enabled ? "on" : ""}`}
                      disabled={updatingAlert === a.strategyId}
                      onClick={() => toggleAlert(a.strategyId, a.enabled)}
                      style={{ fontSize: 12 }}
                    >
                      {a.enabled ? "● Active" : "○ Off"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ margin: "12px 0", fontSize: 13 }}>
                No strategy alerts configured. Starting a trial auto-enables email alerts.
              </div>
            )}
          </div>

          {deliveries.length > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--line)",
                fontSize: 12,
                color: "var(--mut)",
              }}
            >
              📧 {deliveries.length} signal{deliveries.length !== 1 ? "s" : ""} delivered so far
              {deliveries.filter(d => d.deliveryStatus === "SENT").length > 0 && (
                <span style={{ color: "#10b981", marginLeft: 8 }}>
                  · {deliveries.filter(d => d.deliveryStatus === "SENT").length} sent
                </span>
              )}
            </div>
          )}
        </div>

        {/* Trading Connections Panel */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>Trading Connections</h3>
          <p className="note" style={{ fontSize: 13, marginBottom: 16 }}>
            Automated trade routing — zero API secret exposure.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {connections.length > 0 ? (
              connections.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "var(--bg)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <b style={{ fontSize: 14 }}>{c.brokerIdentifier}</b>
                    <div className="note" style={{ fontSize: 12 }}>
                      Status: {c.connectionStatus} · Scopes: {c.grantedScopes.join(", ")}
                    </div>
                  </div>
                  <span className="badge py" style={{ fontSize: 11 }}>Connected</span>
                </div>
              ))
            ) : (
              <div className="empty" style={{ fontSize: 13 }}>No active broker connections.</div>
            )}

            <button
              className="pill g sm"
              onClick={connectSimulator}
              style={{ marginTop: 6, fontSize: 13 }}
            >
              + Connect Paper Simulator
            </button>
            <span className="note" style={{ fontSize: 12 }}>
              Live broker integrations (Alpaca, IBKR) require KYC verification.
            </span>
          </div>
        </div>

        {/* Expired Trials & Upgrade */}
        {expiredTrials.length > 0 && (
          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ fontSize: 17 }}>Expired Trials</h3>
              <Link href="/pricing" className="pill sm" style={{ fontSize: 12 }}>
                View Subscription Plans →
              </Link>
            </div>
            <p className="note" style={{ fontSize: 13, marginBottom: 16 }}>
              These 7-day trials have ended. Subscribe to regain full signal access.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {expiredTrials.map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: "1px dashed var(--line)",
                    borderRadius: 10,
                    padding: 16,
                    background: "var(--bg)",
                    opacity: 0.75,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.strategyName}</div>
                  <div className="note" style={{ margin: "4px 0", fontSize: 12 }}>
                    Expired {new Date(t.expiryTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Link
                      href="/pricing"
                      style={{
                        fontSize: 12,
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        display: "inline-block",
                      }}
                    >
                      Subscribe →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
