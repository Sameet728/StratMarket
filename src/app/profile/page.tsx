"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Trial {
  id: string;
  strategyId: string;
  strategyName: string;
  instrument: string;
  timeframe: string;
  category: string;
  startTime: string | Date;
  expiryTime: string | Date;
  daysLeft: number;
  isExpired: boolean;
  status: string;
}

interface AlertPref {
  id: string;
  strategyId: string;
  enabled: boolean;
  alertTypes: string[];
  verifiedDestination: string;
}

interface EmailDelivery {
  id: string;
  signalId: string;
  deliveryStatus: string;
  sentAt?: string | Date;
  providerMessageRef?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [alerts, setAlerts] = useState<AlertPref[]>([]);
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([]);
  const [profileTab, setProfileTab] = useState<"ALL" | "PINE" | "PYTHON">("ALL");
  const [signalEmail, setSignalEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [updatingAlert, setUpdatingAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meData.authenticated || !meData.user) {
          router.push("/signin");
          return;
        }
        setUser(meData.user);

        // Load trials and entitlements
        const entRes = await fetch("/api/me/entitlements");
        const entData = await entRes.json();
        if (entData.success) {
          setTrials(entData.trials || []);
        }

        // Load alert preferences & destination email
        const alertRes = await fetch("/api/me/alerts");
        const alertData = await alertRes.json();
        if (alertData.success) {
          setStrategies(alertData.strategies || []);
          setAlerts(alertData.preferences || []);
          setDeliveries(alertData.deliveries || []);
          setSignalEmail(alertData.destinationEmail || meData.user.email);
        } else {
          setSignalEmail(meData.user.email);
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Handle saving preferred signal recipient email
  const handleSaveSignalEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(signalEmail)) {
      setEmailStatusMsg({ text: "Please enter a valid email address.", ok: false });
      return;
    }
    setSavingEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_EMAIL", email: signalEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStatusMsg({ text: "Signal notification email saved successfully!", ok: true });
        // Update local alerts destination
        setAlerts((prev) =>
          prev.map((a) => ({ ...a, verifiedDestination: signalEmail }))
        );
      } else {
        setEmailStatusMsg({ text: data.error || "Failed to update email.", ok: false });
      }
    } catch {
      setEmailStatusMsg({ text: "Network error. Please try again.", ok: false });
    } finally {
      setSavingEmail(false);
    }
  };

  // Dispatch sample test email via Resend
  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/me/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signalEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          text: `Sample signal alert sent to ${signalEmail}! Check your inbox.`,
          ok: true,
        });
      } else {
        setTestResult({ text: data.error || "Failed to send sample alert.", ok: false });
      }
    } catch {
      setTestResult({ text: "Network error sending test signal.", ok: false });
    } finally {
      setSendingTest(false);
    }
  };

  // Toggle individual strategy alert
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
          destinationEmail: signalEmail,
        }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.strategyId === strategyId ? { ...a, enabled: !currentEnabled } : a
          )
        );
        setStrategies((prev) =>
          prev.map((s) =>
            s.id === strategyId || s.slug === strategyId ? { ...s, enabled: !currentEnabled } : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle alert:", err);
    } finally {
      setUpdatingAlert(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/signin");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="page" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--mut)" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
          Loading account profile...
        </div>
      </div>
    );
  }

  const activeTrials = trials.filter((t) => !t.isExpired);
  const expiredTrials = trials.filter((t) => t.isExpired);

  return (
    <div className="page" id="p-profile">
      <section className="b">
        <div className="wrap" style={{ maxWidth: 1040, margin: "0 auto" }}>
          
          {/* Header Profile Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 20,
              paddingBottom: 28,
              borderBottom: "1px solid var(--line)",
              marginBottom: 36,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 20,
                    color: "#fff",
                    boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "T"}
                </div>
                <div>
                  <h1 style={{ fontSize: 26, margin: 0, fontWeight: 800 }}>{user?.name || "Trader Account"}</h1>
                  <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>
                    {user?.email} ·{" "}
                    <span style={{ color: "#10b981", fontWeight: 600 }}>
                      ● {user?.role === "ADMIN" ? "Administrator" : "Active Member"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/dashboard" className="pill g sm" style={{ fontSize: 13 }}>
                📊 Open Dashboard
              </Link>
              <Link href="/market" className="pill sm" style={{ fontSize: 13 }}>
                Explore Strategies →
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="pill g sm"
                style={{ fontSize: 13, color: "var(--mut)" }}
              >
                Sign out
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>

            {/* 1. STRATEGY 7-DAY TRIALS & SUBSCRIPTION PURCHASES */}
            <div
              className="card"
              style={{
                padding: "28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>
                    7-Day Free Trials & Subscriptions
                  </h2>
                  <p className="note" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    Monitor your strategy trial countdowns and upgrade to retain 24/7 institutional signals.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="pill sm"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  View All Subscription Plans →
                </Link>
              </div>

              {/* Active Trials */}
              {activeTrials.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16, marginTop: 18 }}>
                  {activeTrials.map((t) => {
                    const expiry = new Date(t.expiryTime);
                    const expiryDateStr = expiry.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const expiryTimeStr = expiry.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const isEndingSoon = t.daysLeft <= 2;
                    const progressPercent = Math.max(5, Math.min(100, Math.round((t.daysLeft / 7) * 100)));

                    return (
                      <div
                        key={t.id}
                        style={{
                          border: isEndingSoon ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid var(--line)",
                          borderRadius: 12,
                          padding: 20,
                          background: isEndingSoon ? "rgba(245, 158, 11, 0.04)" : "rgba(255,255,255,0.015)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          position: "relative",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: isEndingSoon ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.15)",
                                color: isEndingSoon ? "#f59e0b" : "#10b981",
                                border: isEndingSoon ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              {isEndingSoon ? "⚠️ ENDING SOON" : "● TRIAL ACTIVE"}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--mut)", fontFamily: "'JetBrains Mono', monospace" }}>
                              {t.instrument} · {t.timeframe}
                            </span>
                          </div>

                          <h3 style={{ fontSize: 16, margin: "6px 0 4px", fontWeight: 700 }}>
                            {t.strategyName}
                          </h3>

                          {/* Countdown Bar */}
                          <div style={{ marginTop: 14, marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                              <span style={{ color: "var(--mut)" }}>Trial Status:</span>
                              <strong style={{ color: isEndingSoon ? "#f59e0b" : "#10b981" }}>
                                {t.daysLeft === 1 ? "Ends today / 24h" : `${t.daysLeft} days remaining`}
                              </strong>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: 6,
                                background: "rgba(255,255,255,0.06)",
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${progressPercent}%`,
                                  height: "100%",
                                  background: isEndingSoon
                                    ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                                    : "linear-gradient(90deg, #10b981, #3b82f6)",
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                            <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 6 }}>
                              Expires: <b>{expiryDateStr}</b> at {expiryTimeStr}
                            </div>
                          </div>
                        </div>

                        {/* Buy / Upgrade Action */}
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
                          <Link
                            href={`/chart?strategy=${t.strategyId}`}
                            className="pill g sm"
                            style={{ flex: 1, textAlign: "center", fontSize: 12 }}
                          >
                            Live Chart
                          </Link>
                          <Link
                            href="/pricing"
                            className="pill sm"
                            style={{
                              flex: 1.4,
                              textAlign: "center",
                              fontSize: 12,
                              background: isEndingSoon
                                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                              color: "#fff",
                              border: "none",
                              fontWeight: 600,
                            }}
                          >
                            Subscribe ($49/mo) →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    border: "1px dashed var(--line)",
                    borderRadius: 12,
                    marginTop: 16,
                  }}
                >
                  <p style={{ margin: "0 0 12px", color: "var(--mut)", fontSize: 14 }}>
                    You don't have any active 7-day trials. Pick any strategy to start evaluating live signals.
                  </p>
                  <Link href="/market" className="pill sm">
                    Browse All 6 Strategies →
                  </Link>
                </div>
              )}

              {/* Expired Trials Section */}
              {expiredTrials.length > 0 && (
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                  <h4 style={{ fontSize: 14, margin: "0 0 12px", color: "var(--mut)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Expired Trials ({expiredTrials.length})
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {expiredTrials.map((et) => (
                      <div
                        key={et.id}
                        style={{
                          border: "1px dashed var(--line)",
                          borderRadius: 10,
                          padding: 14,
                          background: "rgba(255,255,255,0.01)",
                          opacity: 0.8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{et.strategyName}</div>
                          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                            Ended {new Date(et.expiryTime).toLocaleDateString()}
                          </div>
                        </div>
                        <Link
                          href="/pricing"
                          style={{
                            fontSize: 12,
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid var(--line)",
                            color: "var(--tx)",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Reactivate →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. REAL-TIME SIGNAL EMAIL NOTIFICATION SETTINGS */}
            <div
              className="card"
              style={{
                padding: "28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>
                    Signal Notification Email
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(16,185,129,0.15)",
                      color: "#10b981",
                      padding: "2px 8px",
                      borderRadius: 10,
                      border: "1px solid rgba(16,185,129,0.3)",
                    }}
                  >
                    Resend Verified Domain: elvariscapital.in
                  </span>
                </div>
                <p className="note" style={{ margin: 0, fontSize: 13 }}>
                  Configure the exact email inbox where live MT5 VPS signals (Entry, TP, SL) will be delivered.
                </p>
              </div>

              {/* Email Input & Update Form */}
              <form onSubmit={handleSaveSignalEmail} style={{ maxWidth: 540, marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Deliver Signals To:
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    type="email"
                    value={signalEmail}
                    onChange={(e) => setSignalEmail(e.target.value)}
                    placeholder="e.g. trader@yourdomain.com"
                    required
                    style={{
                      flex: 1,
                      minWidth: 260,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--tx)",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={savingEmail}
                    className="pill sm"
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "0 20px",
                    }}
                  >
                    {savingEmail ? "Saving..." : "Save Email"}
                  </button>
                  <button
                    type="button"
                    disabled={sendingTest}
                    onClick={handleSendTestEmail}
                    className="pill g sm"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {sendingTest ? "Sending..." : "✉️ Send Test Signal"}
                  </button>
                </div>

                {emailStatusMsg && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: emailStatusMsg.ok ? "#10b981" : "#ef4444",
                    }}
                  >
                    {emailStatusMsg.ok ? "✓ " : "✕ "}
                    {emailStatusMsg.text}
                  </div>
                )}

                {testResult && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: testResult.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                      border: testResult.ok ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(239,68,68,0.25)",
                      fontSize: 13,
                      color: testResult.ok ? "#10b981" : "#ef4444",
                    }}
                  >
                    {testResult.ok ? "✓ " : "✕ "}
                    {testResult.text}
                  </div>
                )}
              </form>

              {/* Per-Strategy Alert Subscriptions */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
                      Strategy Alert Feeds &amp; Live Controls
                    </h3>
                    <p className="note" style={{ fontSize: 13, margin: "2px 0 0" }}>
                      Toggle real-time notifications (Entry, TP, SL) and jump directly into live candlestick charts.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setProfileTab("ALL")}
                      className={`pill ${profileTab === "ALL" ? "" : "g"} sm`}
                      style={{ fontSize: 12 }}
                    >
                      All ({strategies.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileTab("PINE")}
                      className={`pill ${profileTab === "PINE" ? "" : "g"} sm`}
                      style={{
                        fontSize: 12,
                        color: profileTab === "PINE" ? "#4ade80" : undefined,
                      }}
                    >
                      🌲 Pine ({strategies.filter((s) => s.type === "PINE_SCRIPT").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileTab("PYTHON")}
                      className={`pill ${profileTab === "PYTHON" ? "" : "g"} sm`}
                      style={{
                        fontSize: 12,
                        color: profileTab === "PYTHON" ? "#fde047" : undefined,
                      }}
                    >
                      🐍 Python ({strategies.filter((s) => s.type === "PYTHON").length})
                    </button>
                  </div>
                </div>

                {strategies.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {strategies
                      .filter((s) =>
                        profileTab === "ALL"
                          ? true
                          : profileTab === "PINE"
                          ? s.type === "PINE_SCRIPT"
                          : s.type === "PYTHON"
                      )
                      .map((s) => {
                        const isPine = s.type === "PINE_SCRIPT";
                        return (
                          <div
                            key={s.id}
                            style={{
                              border: s.enabled
                                ? "1px solid rgba(16,185,129,0.35)"
                                : "1px solid var(--line)",
                              borderRadius: 10,
                              padding: "14px 18px",
                              background: s.enabled
                                ? "linear-gradient(135deg, rgba(16,185,129,0.03) 0%, rgba(15,23,42,0.2) 100%)"
                                : "rgba(255,255,255,0.015)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 12,
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: isPine ? "rgba(76,199,154,0.15)" : "rgba(234,179,8,0.15)",
                                    color: isPine ? "#4ade80" : "#fde047",
                                  }}
                                >
                                  {isPine ? "🌲 PINE" : "🐍 PYTHON"}
                                </span>
                                <strong style={{ fontSize: 15 }}>{s.name}</strong>
                                <span style={{ fontSize: 12, color: "var(--mut)" }}>
                                  ({s.id} · {s.instrument} {s.timeframe})
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>
                                Delivering to: <code style={{ color: "#38bdf8" }}>{signalEmail}</code>
                                {s.trialStatus === "ACTIVE" && (
                                  <span style={{ color: "#10b981", marginLeft: 10 }}>
                                    ● 7-Day Trial Active ({s.daysLeft}d left)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Link
                                href={s.chartUrl}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid rgba(56,189,248,0.3)",
                                  background: "rgba(56,189,248,0.08)",
                                  color: "#38bdf8",
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <span>📈</span> Chart
                              </Link>

                              <button
                                type="button"
                                disabled={updatingAlert === s.id}
                                onClick={() => toggleAlert(s.id, s.enabled)}
                                style={{
                                  padding: "7px 16px",
                                  borderRadius: 20,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: s.enabled ? "1px solid rgba(16,185,129,0.5)" : "1px solid var(--line)",
                                  background: s.enabled ? "rgba(16,185,129,0.2)" : "transparent",
                                  color: s.enabled ? "#10b981" : "var(--mut)",
                                  transition: "all 0.2s",
                                }}
                              >
                                {updatingAlert === s.id
                                  ? "Updating..."
                                  : s.enabled
                                  ? "● Alerts Active"
                                  : "○ Turn ON"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--mut)", padding: 16, border: "1px dashed var(--line)", borderRadius: 8 }}>
                    Loading strategy alert feeds...
                  </div>
                )}
              </div>

              {/* Delivery History */}
              {deliveries.length > 0 && (
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13, color: "var(--mut)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>📧 Recent signal delivery log:</span>
                    <strong style={{ color: "var(--tx)" }}>{deliveries.length} emails dispatched</strong>
                    <span style={{ color: "#10b981" }}>
                      ({deliveries.filter((d) => d.deliveryStatus === "SENT").length} delivered successfully)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. ACCOUNT SECURITY & PLAN TIERS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 20,
              }}
            >
              <div
                className="card"
                style={{
                  padding: 24,
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 700 }}>Account Security</h3>
                <p className="note" style={{ fontSize: 13, marginBottom: 14 }}>
                  Authentication and session parameters handled with JWT HTTP-only cookies and bcrypt password hashing.
                </p>
                <div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.8 }}>
                  <div>Status: <span style={{ color: "#10b981", fontWeight: 600 }}>Active</span></div>
                  <div>Role: <span style={{ color: "var(--tx)", fontWeight: 600 }}>{user?.role}</span></div>
                  <div>Sender: <span style={{ color: "#38bdf8" }}>StratMarket &lt;alerts@elvariscapital.in&gt;</span></div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(16,185,129,0.05) 100%)",
                }}
              >
                <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 700 }}>Upgrade to Unlimited Access</h3>
                <p className="note" style={{ fontSize: 13, marginBottom: 16 }}>
                  Full multi-strategy live execution, automated webhook dispatch, and direct broker routing.
                </p>
                <Link
                  href="/pricing"
                  className="pill"
                  style={{
                    display: "inline-block",
                    fontSize: 13,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                  }}
                >
                  Explore Pricing & Plans →
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}
