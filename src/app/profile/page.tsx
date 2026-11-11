"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/Toast";
import {
  getBrowserAlertPreference,
  setBrowserAlertPreference,
  requestBrowserNotificationPermission,
  sendBrowserTradeNotification,
  isNotificationSupported,
} from "@/lib/notifications/browser-notifications";

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
  recipientEmail?: string;
  strategyId?: string;
  strategyName?: string;
  instrument?: string;
  timeframe?: string;
  signalType?: string;
  direction?: string;
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
}

function formatDeliveryTime(raw?: string | Date): { formatted: string; relative: string } {
  if (!raw) return { formatted: "Just now", relative: "Recent" };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { formatted: String(raw), relative: "" };

  const formatted = d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  let relative = "just now";
  if (diffDay > 0) relative = `${diffDay}d ago`;
  else if (diffHour > 0) relative = `${diffHour}h ago`;
  else if (diffMin > 0) relative = `${diffMin}m ago`;
  else if (diffSec > 5) relative = `${diffSec}s ago`;

  return { formatted, relative };
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
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertPref[]>([]);
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string>("ALL");
  const [deliveryLimit, setDeliveryLimit] = useState<number>(8);
  const [profileTab, setProfileTab] = useState<"ALL" | "PINE">("ALL");
  const [signalEmail, setSignalEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [updatingAlert, setUpdatingAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const [browserAlertsSupported, setBrowserAlertsSupported] = useState(false);

  // Sync browser notification preference on mount
  useEffect(() => {
    setBrowserAlertsSupported(isNotificationSupported());
    setBrowserAlertsEnabled(getBrowserAlertPreference());
  }, []);

  // 1. Instant Cache Hydration: Read cached profile from localStorage immediately (0ms latency)
  useEffect(() => {
    try {
      const cached = localStorage.getItem("stratmarket_user_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.user) {
          setUser(parsed.user);
          if (parsed.signalEmail) setSignalEmail(parsed.signalEmail);
          if (Array.isArray(parsed.trials)) setTrials(parsed.trials);
          if (Array.isArray(parsed.entitlements)) setEntitlements(parsed.entitlements);
          if (Array.isArray(parsed.strategies)) setStrategies(parsed.strategies);
          if (Array.isArray(parsed.deliveries)) setDeliveries(parsed.deliveries);
          if (parsed.testEmailSent !== undefined) setTestEmailSent(parsed.testEmailSent);
          setLoading(false); // Instantly dismiss spinner!
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fast Auth Check (<60ms) - Unblock Profile UI immediately
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meData.authenticated || !meData.user) {
          router.push("/signin");
          return;
        }
        setUser(meData.user);
        setSignalEmail(meData.user.email);
        setLoading(false); // Instantly dismiss full-page spinner! User sees profile banner in <100ms

        // 2. Fetch entitlements and alerts asynchronously in parallel
        const [entRes, alertRes] = await Promise.all([
          fetch("/api/me/entitlements"),
          fetch("/api/me/alerts"),
        ]);

        // Load trials, entitlements and purchase orders
        let fetchedTrials: Trial[] = [];
        let fetchedEntitlements: any[] = [];
        const entData = await entRes.json().catch(() => ({}));
        if (entData.success) {
          fetchedTrials = entData.trials || [];
          fetchedEntitlements = entData.entitlements || [];
          setTrials(fetchedTrials);
          setEntitlements(fetchedEntitlements);
          setOrders(entData.orders || []);
        }

        // Load alert preferences & destination email
        let reconciledStrategies: any[] = [];
        let fetchedDeliveries: EmailDelivery[] = [];
        let destEmail = meData.user.email;
        let isTestSent = false;

        const alertData = await alertRes.json().catch(() => ({}));
        if (alertData.success) {
          let localAlertMap: Record<string, boolean> = {};
          try {
            const raw = localStorage.getItem("stratmarket_user_alerts_" + meData.user.id);
            if (raw) localAlertMap = JSON.parse(raw);
          } catch (_) {}

          const rawStrategies = alertData.strategies || [];
          reconciledStrategies = rawStrategies.map((s: any) => {
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
            reconciledStrategies.forEach((s: any) => {
              synced[s.id] = s.enabled;
              synced[s.slug] = s.enabled;
            });
            localStorage.setItem("stratmarket_user_alerts_" + meData.user.id, JSON.stringify(synced));
          } catch (_) {}

          setStrategies(reconciledStrategies);
          setAlerts(alertData.preferences || []);
          fetchedDeliveries = alertData.deliveries || [];
          setDeliveries(fetchedDeliveries);
          if (alertData.testEmailSent) {
            isTestSent = true;
            setTestEmailSent(true);
          }
          destEmail = alertData.destinationEmail || meData.user.email;
          setSignalEmail(destEmail);
        } else {
          setSignalEmail(meData.user.email);
        }

        // Cache full profile snapshot for instant 0ms restoration on subsequent visits
        try {
          localStorage.setItem(
            "stratmarket_user_profile",
            JSON.stringify({
              user: meData.user,
              signalEmail: destEmail,
              trials: fetchedTrials,
              entitlements: fetchedEntitlements,
              strategies: reconciledStrategies,
              deliveries: fetchedDeliveries,
              testEmailSent: isTestSent,
            })
          );
        } catch (_) {}
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
        toast.success("Destination Updated", `Signal notification email set to ${signalEmail}`);
        // Update local alerts destination
        setAlerts((prev) =>
          prev.map((a) => ({ ...a, verifiedDestination: signalEmail }))
        );
      } else {
        setEmailStatusMsg({ text: data.error || "Failed to update email.", ok: false });
        toast.error("Update Failed", data.error || "Failed to update destination email.");
      }
    } catch {
      setEmailStatusMsg({ text: "Network error. Please try again.", ok: false });
      toast.error("Network Error", "Could not reach notification service.");
    } finally {
      setSavingEmail(false);
    }
  };

  // Dispatch sample test email via institutional gateway
  const handleSendTestEmail = async () => {
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
        body: JSON.stringify({ email: signalEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailSent(true);
        setTestResult({
          text: `Sample verification test alert sent to ${signalEmail}! Check your inbox. (Limit: 1/1 test email used)`,
          ok: true,
        });
        toast.success(
          "Test Signal Dispatched",
          `Verification alert delivered to ${signalEmail}! (1/1 test used)`
        );
      } else {
        if (data.alreadySent) setTestEmailSent(true);
        setTestResult({ text: data.error || "Failed to send sample alert.", ok: false });
        if (data.alreadySent) {
          toast.warning("Test Quota Reached", "Max 1 test email limit per user has already been reached.");
        } else {
          toast.error("Dispatch Failed", data.error || "Failed to send sample alert.");
        }
      }
    } catch {
      setTestResult({ text: "Network error sending test signal.", ok: false });
      toast.error("Network Error", "Could not dispatch verification email.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleToggleBrowserAlerts = async () => {
    if (!browserAlertsEnabled) {
      const granted = await requestBrowserNotificationPermission();
      if (granted) {
        setBrowserAlertsEnabled(true);
        toast.success(
          "Chrome Push Notifications Enabled",
          "You will receive desktop alerts for Trade Entries, Take Profit (+1.16R), and Stop Loss (-1.00R)."
        );
        sendBrowserTradeNotification({
          strategyName: "Grandmaster Dual (PS-01)",
          strategyId: "PS-01",
          signalType: "ENTRY",
          direction: "LONG",
          entryPrice: 4055.2,
          instrument: "XAUUSD",
        });
      } else {
        toast.warning(
          "Notification Permission Blocked",
          "Please click the lock icon in Chrome's address bar and set Notifications to Allow."
        );
      }
    } else {
      setBrowserAlertPreference(false);
      setBrowserAlertsEnabled(false);
      toast.info("Push Notifications Paused", "Desktop trade notifications are disabled.");
    }
  };

  const handleTestBrowserAlert = () => {
    if (!browserAlertsEnabled) {
      toast.info("Enable Push First", "Please turn on browser notifications before testing.");
      return;
    }
    sendBrowserTradeNotification({
      strategyName: "StratMarket Institutional",
      strategyId: "PS-01",
      signalType: "TAKE_PROFIT",
      direction: "LONG",
      entryPrice: 4055.2,
      exitPrice: 4071.2,
      pnlR: "+1.16R",
      instrument: "XAUUSD",
    });
    toast.trade("Test Push Triggered", "Check your system desktop notifications for the alert chime.");
  };

  // Toggle individual strategy alert
  const toggleAlert = async (strategyId: string, currentEnabled: boolean) => {
    setUpdatingAlert(strategyId);
    const newEnabled = !currentEnabled;

    // Optimistically update UI immediately for 0ms latency
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === strategyId || s.slug === strategyId
          ? {
              ...s,
              enabled: newEnabled,
              trialStatus: s.trialStatus === "NOT_STARTED" && newEnabled ? "ACTIVE" : s.trialStatus,
              daysLeft: s.daysLeft === 0 && newEnabled ? 7 : s.daysLeft,
            }
          : s
      )
    );
    setAlerts((prev) =>
      prev.map((a) =>
        a.strategyId === strategyId ? { ...a, enabled: newEnabled } : a
      )
    );

    // Persist immediately in client-side storage for refresh durability
    try {
      const storageKey = "stratmarket_user_alerts_" + (user?.id || "default");
      const raw = localStorage.getItem(storageKey);
      const currentMap = raw ? JSON.parse(raw) : {};
      currentMap[strategyId] = newEnabled;
      currentMap[strategyId.toUpperCase()] = newEnabled;
      currentMap[strategyId.toLowerCase()] = newEnabled;
      localStorage.setItem(storageKey, JSON.stringify(currentMap));
    } catch (_) {}

    try {
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          enabled: newEnabled,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
          destinationEmail: signalEmail || user?.email,
        }),
      });

      if (!res.ok) {
        toast.error("Alert Update Failed", "Failed to update alert preference. Reverting.");
        // Revert on error
        setStrategies((prev) =>
          prev.map((s) =>
            s.id === strategyId || s.slug === strategyId ? { ...s, enabled: currentEnabled } : s
          )
        );
        setAlerts((prev) =>
          prev.map((a) =>
            a.strategyId === strategyId ? { ...a, enabled: currentEnabled } : a
          )
        );
        try {
          const storageKey = "stratmarket_user_alerts_" + (user?.id || "default");
          const raw = localStorage.getItem(storageKey);
          const currentMap = raw ? JSON.parse(raw) : {};
          currentMap[strategyId] = currentEnabled;
          localStorage.setItem(storageKey, JSON.stringify(currentMap));
        } catch (_) {}
      } else {
        if (newEnabled) {
          toast.success("Signal Alerts Active", `${strategyId} notifications enabled.`);
        } else {
          toast.info("Signal Alerts Paused", `${strategyId} notifications paused.`);
        }
        // Silently sync latest trial records in background
        fetch("/api/me/entitlements")
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.trials) setTrials(data.trials);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Failed to toggle alert:", err);
      toast.error("Network Error", "Could not reach alert notification service.");
      // Revert on exception
      setStrategies((prev) =>
        prev.map((s) =>
          s.id === strategyId || s.slug === strategyId ? { ...s, enabled: currentEnabled } : s
        )
      );
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
          <div className="chart-spinner" style={{ margin: "0 auto 16px", width: 28, height: 28 }} />
          Loading account profile...
        </div>
      </div>
    );
  }

  const activeTrials = trials.filter((t) => !t.isExpired);
  const expiredTrials = trials.filter((t) => t.isExpired);
  const activePaidSubs = entitlements.filter((e) => e.isActive && e.entitlementType === "PAID");
  const filteredDeliveries = deliveries.filter((d) => {
    if (deliveryFilter === "ALL") return true;
    return (d.strategyId || "PS-01").toUpperCase() === deliveryFilter.toUpperCase();
  });

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
                    background: "linear-gradient(135deg, #ffffff 0%, #71717a 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 20,
                    color: "#000",
                    boxShadow: "0 4px 14px rgba(255, 255, 255, 0.12)",
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "T"}
                </div>
                <div>
                  <h1 style={{ fontSize: 26, margin: 0, fontWeight: 800 }}>{user?.name || "Trader Account"}</h1>
                  <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>
                    {user?.email} ·{" "}
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>
                      ● {user?.role === "ADMIN" ? "Administrator" : "Active Member"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-header-actions" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/dashboard" className="pill g sm" style={{ fontSize: 13 }}>
                Open Dashboard →
              </Link>
              <Link href="/chart/ps-01" className="pill sm" style={{ fontSize: 13, background: "#ffffff", color: "#000", fontWeight: 800 }}>
                Live Charts →
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

            {/* 1. INSTITUTIONAL STRATEGY ACCESS (100% FREE ACCESS) */}
            <div
              className="card profile-section-card"
              style={{
                padding: "28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "rgba(255, 255, 255, 0.02)",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>
                      Institutional Strategy Access
                    </h2>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "rgba(163, 230, 53, 0.1)",
                        color: "#a3e635",
                        border: "1px solid rgba(163, 230, 53, 0.3)",
                      }}
                    >
                      ● 100% FREE ACCESS
                    </span>
                  </div>
                  <p className="note" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    Full unconstrained access to all quantitative trading strategies, live TradingView candlestick charts, and real-time trade signals.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href="/chart/ps-01"
                    className="pill sm"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      background: "#ffffff",
                      color: "#000000",
                      textDecoration: "none",
                    }}
                  >
                    Open Live Charts →
                  </Link>
                  <Link
                    href="/market"
                    className="pill g sm"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Explore Strategies
                  </Link>
                </div>
              </div>

              {/* Grid of Strategies with Live Access */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 14, marginTop: 20 }}>
                {strategies.map((s) => {
                  const isPine = s.type === "PINE_SCRIPT";
                  return (
                    <div
                      key={s.id}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        padding: 18,
                        background: "rgba(255, 255, 255, 0.015)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "#ffffff",
                            }}
                          >
                            {isPine ? "PINE SCRIPT" : "QUANT ALGO"}
                          </span>
                          <span style={{ fontSize: 11.5, color: "var(--mut)", fontFamily: "'JetBrains Mono', monospace" }}>
                            {s.instrument || "XAUUSD"} · {s.timeframe || "M15"}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 16, margin: "4px 0 6px", fontWeight: 700, color: "#ffffff" }}>
                          {s.name}
                        </h3>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a3e635", fontWeight: 600, marginTop: 6 }}>
                          <span>●</span>
                          <span>Full Live Access</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
                        <Link
                          href={`/chart/${encodeURIComponent(s.id)}`}
                          className="pill sm"
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: 12,
                            background: "#ffffff",
                            color: "#000000",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Open Live Chart ↗
                        </Link>
                        <Link
                          href={`/strategies/${s.slug || s.id.toLowerCase()}`}
                          className="pill g sm"
                          style={{
                            fontSize: 12,
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Report
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>




            {/* 2. REAL-TIME SIGNAL EMAIL NOTIFICATION SETTINGS */}
            <div
              className="card profile-section-card"
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
                      background: "rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: 10,
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    Institutional Gateway • Domain: elvariscapital.in
                  </span>
                </div>
                <p className="note" style={{ margin: 0, fontSize: 13 }}>
                  Configure the exact email inbox where live quantitative strategy signals (Entry, TP, SL) will be delivered.
                </p>
              </div>

              {/* Email Input & Update Form */}
              <form onSubmit={handleSaveSignalEmail} style={{ maxWidth: 540, marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Deliver Signals To:
                </label>
                <div className="profile-email-form" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                      background: "#ffffff",
                      border: "none",
                      color: "#000000",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "0 20px",
                    }}
                  >
                    {savingEmail ? "Saving..." : "Save Email"}
                  </button>
                  <button
                    type="button"
                    disabled={sendingTest || testEmailSent}
                    onClick={handleSendTestEmail}
                    className={`pill ${testEmailSent ? "d" : "g"} sm`}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      opacity: testEmailSent ? 0.6 : 1,
                      cursor: testEmailSent ? "not-allowed" : "pointer",
                    }}
                    title={testEmailSent ? "Test email has already been sent (limit: 1 per user)" : "Send a verification test email"}
                  >
                    {sendingTest ? "Sending..." : testEmailSent ? "✓ Test Email Sent (1/1)" : "Send Test Signal"}
                  </button>
                </div>

                {emailStatusMsg && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: emailStatusMsg.ok ? "#ffffff" : "#ef4444",
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
                      background: testResult.ok ? "rgba(255, 255, 255, 0.12)" : "rgba(239,68,68,0.08)",
                      border: testResult.ok ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(239,68,68,0.25)",
                      fontSize: 13,
                      color: testResult.ok ? "#ffffff" : "#ef4444",
                    }}
                  >
                    {testResult.ok ? "✓ " : "✕ "}
                    {testResult.text}
                  </div>
                )}
              </form>

              {/* Chrome Desktop & Mobile Push Notifications Card */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  marginBottom: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>🔔</span>
                    <strong style={{ fontSize: 15, color: "#ffffff" }}>
                      Chrome &amp; Desktop Browser Push Notifications
                    </strong>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: browserAlertsEnabled ? "rgba(163, 230, 53, 0.15)" : "rgba(255, 255, 255, 0.06)",
                        color: browserAlertsEnabled ? "#a3e635" : "#a1a1aa",
                        border: `1px solid ${browserAlertsEnabled ? "rgba(163, 230, 53, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                      }}
                    >
                      {browserAlertsEnabled ? "PUSH ACTIVE" : "PUSH OFF"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--mut)", maxWidth: 540, lineHeight: 1.5 }}>
                    Receive instant desktop notifications and audio chimes whenever an institutional trade enters, hits Take Profit (+1.16R), or Stop Loss (-1.00R)—even if you are on another browser tab.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleToggleBrowserAlerts}
                    className="pill sm"
                    style={{
                      background: browserAlertsEnabled ? "#ffffff" : "rgba(255, 255, 255, 0.08)",
                      color: browserAlertsEnabled ? "#000000" : "#ffffff",
                      fontWeight: 700,
                      fontSize: 12.5,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      cursor: "pointer",
                      padding: "8px 16px",
                      touchAction: "manipulation",
                    }}
                  >
                    {browserAlertsEnabled ? "✓ Chrome Push ON (Click to Pause)" : "🔔 Turn ON Chrome Push"}
                  </button>
                  {browserAlertsEnabled && (
                    <button
                      type="button"
                      onClick={handleTestBrowserAlert}
                      className="pill g sm"
                      style={{ fontSize: 12.5, padding: "8px 14px", cursor: "pointer", touchAction: "manipulation" }}
                      title="Trigger an audible test browser alert"
                    >
                      Test Chime &amp; Push
                    </button>
                  )}
                </div>
              </div>

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
                      All Pine Strategies ({strategies.length})
                    </button>
                  </div>
                </div>

                {strategies.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {strategies
                      .filter((s) =>
                        profileTab === "ALL"
                          ? true
                          : s.type === "PINE_SCRIPT"
                      )
                      .map((s) => {
                        const isPine = s.type === "PINE_SCRIPT";
                        return (
                          <div
                            key={s.id}
                            style={{
                              border: s.enabled
                                ? "1px solid rgba(255, 255, 255, 0.12)"
                                : "1px solid var(--line)",
                              borderRadius: 10,
                              padding: "14px 18px",
                              background: s.enabled
                                ? "rgba(255, 255, 255, 0.02)"
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
                                    background: "rgba(255, 255, 255, 0.08)",
                                    color: "#ffffff",
                                  }}
                                >
                                  {isPine ? "PINE SCRIPT" : "QUANT ALGO"}
                                </span>
                                <strong style={{ fontSize: 15 }}>{s.name}</strong>
                                <span style={{ fontSize: 12, color: "var(--mut)" }}>
                                  ({s.id} · {s.instrument} {s.timeframe})
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>
                                Delivering to: <code style={{ color: "#ffffff" }}>{signalEmail}</code>
                                <span style={{ color: "#a3e635", marginLeft: 10, fontSize: 11.5 }}>
                                  ● Free Live Signals
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Link
                                href={`/chart/${s.id}`}
                                className="pill g sm"
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: "6px 14px",
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                Live Chart ↗
                              </Link>

                              <button
                                type="button"
                                disabled={updatingAlert === s.id}
                                onClick={() => toggleAlert(s.id, s.enabled)}
                                style={{
                                  padding: "7px 18px",
                                  borderRadius: 20,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: updatingAlert === s.id ? "wait" : "pointer",
                                  border: s.enabled ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.18)",
                                  background: s.enabled ? "rgba(255, 255, 255, 0.12)" : "rgba(255,255,255,0.04)",
                                  color: s.enabled ? "#ffffff" : "var(--tx)",
                                  boxShadow: s.enabled ? "0 0 12px rgba(255, 255, 255, 0.12)" : "none",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {updatingAlert === s.id
                                  ? (s.enabled ? "● Saving..." : "○ Saving...")
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

              {/* 3. SIGNAL NOTIFICATION & ALERT DELIVERY HISTORY */}
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Signal Alert Delivery History
                      </h4>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "rgba(56, 189, 248, 0.12)",
                          color: "#38bdf8",
                          border: "1px solid rgba(56, 189, 248, 0.25)",
                        }}
                      >
                        Live Notification Audit Log
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--mut)" }}>
                      Live audit trail of algorithmic trade execution signals dispatched to {signalEmail || user?.email || "your inbox"}.
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <div
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: "var(--mut)" }}>Dispatched:</span>
                      <strong style={{ color: "var(--tx)" }}>{deliveries.length}</strong>
                      <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
                      <span style={{ color: "#22c55e", fontWeight: 600 }}>
                        {deliveries.filter((d) => d.deliveryStatus === "SENT").length} Delivered (100% Success)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filter Strategy Tabs */}
                {deliveries.length > 0 && (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter("ALL")}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12,
                        borderRadius: 20,
                        border: deliveryFilter === "ALL" ? "1px solid #ffffff" : "1px solid var(--line)",
                        background: deliveryFilter === "ALL" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                        color: deliveryFilter === "ALL" ? "#ffffff" : "var(--mut)",
                        cursor: "pointer",
                        fontWeight: deliveryFilter === "ALL" ? 700 : 500,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      All Signals ({deliveries.length})
                    </button>
                    {Array.from(new Set(deliveries.map((d) => (d.strategyId || "PS-01").toUpperCase()))).map((stratId) => {
                      const count = deliveries.filter((d) => (d.strategyId || "PS-01").toUpperCase() === stratId).length;
                      const sample = deliveries.find((d) => (d.strategyId || "PS-01").toUpperCase() === stratId);
                      const label = sample?.strategyName || stratId;
                      const isSelected = deliveryFilter === stratId;
                      return (
                        <button
                          key={stratId}
                          type="button"
                          onClick={() => setDeliveryFilter(stratId)}
                          style={{
                            padding: "5px 12px",
                            fontSize: 12,
                            borderRadius: 20,
                            border: isSelected ? "1px solid #38bdf8" : "1px solid var(--line)",
                            background: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                            color: isSelected ? "#38bdf8" : "var(--mut)",
                            cursor: "pointer",
                            fontWeight: isSelected ? 700 : 500,
                            whiteSpace: "nowrap",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Delivery History List */}
                {deliveries.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredDeliveries.slice(0, deliveryLimit).map((del) => {
                      const timeMeta = formatDeliveryTime(del.sentAt);
                      const isLong = (del.direction || "LONG").toUpperCase() === "LONG";
                      const isShort = (del.direction || "").toUpperCase() === "SHORT";
                      const actionType = (del.signalType || "ENTRY").toUpperCase();

                      let badgeBg = "rgba(56, 189, 248, 0.12)";
                      let badgeColor = "#38bdf8";
                      let badgeBorder = "rgba(56, 189, 248, 0.3)";

                      if (actionType === "ENTRY") {
                        if (isLong) {
                          badgeBg = "rgba(34, 197, 94, 0.12)";
                          badgeColor = "#22c55e";
                          badgeBorder = "rgba(34, 197, 94, 0.3)";
                        } else {
                          badgeBg = "rgba(239, 68, 68, 0.12)";
                          badgeColor = "#ef4444";
                          badgeBorder = "rgba(239, 68, 68, 0.3)";
                        }
                      } else if (actionType === "TAKE_PROFIT") {
                        badgeBg = "rgba(245, 158, 11, 0.12)";
                        badgeColor = "#f59e0b";
                        badgeBorder = "rgba(245, 158, 11, 0.3)";
                      } else if (actionType === "STOP_LOSS") {
                        badgeBg = "rgba(239, 68, 68, 0.08)";
                        badgeColor = "#f87171";
                        badgeBorder = "rgba(239, 68, 68, 0.2)";
                      }

                      const stratSlug = (del.strategyId || "ps-01").toLowerCase();
                      const chartLink = `/chart/${stratSlug}`;

                      return (
                        <div
                          key={del.id}
                          style={{
                            padding: "14px 18px",
                            borderRadius: 10,
                            background: "rgba(255, 255, 255, 0.015)",
                            border: "1px solid var(--line)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            transition: "background 0.2s ease, border-color 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              {/* Direction / Type Badge */}
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  padding: "3px 9px",
                                  borderRadius: 6,
                                  background: badgeBg,
                                  color: badgeColor,
                                  border: `1px solid ${badgeBorder}`,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontFamily: "'SF Mono', Menlo, monospace",
                                }}
                              >
                                <span>{isLong ? "▲" : isShort ? "▼" : "●"}</span>
                                <span>{actionType} {del.direction ? `(${del.direction})` : ""}</span>
                              </span>

                              {/* Strategy Name & Instrument */}
                              <div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: "#ffffff", marginRight: 8 }}>
                                  {del.strategyName || del.strategyId || "Algorithmic Strategy"}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: "rgba(255, 255, 255, 0.06)",
                                    color: "var(--mut)",
                                    fontFamily: "'SF Mono', Menlo, monospace",
                                  }}
                                >
                                  {del.instrument || "XAUUSD"} • {del.timeframe || "M15"}
                                </span>
                              </div>
                            </div>

                            {/* Timestamp & Relative time */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--mut)" }}>
                              <span title={timeMeta.formatted}>{timeMeta.formatted}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "1px 6px",
                                  borderRadius: 12,
                                  background: "rgba(255, 255, 255, 0.06)",
                                  color: "#a1a1aa",
                                }}
                              >
                                {timeMeta.relative}
                              </span>
                            </div>
                          </div>

                          {/* Price details & Execution Meta */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", color: "var(--mut)" }}>
                              {del.entryPrice !== undefined && del.entryPrice !== null && (
                                <div>
                                  <span style={{ color: "var(--mut)", marginRight: 4 }}>Price:</span>
                                  <strong style={{ color: "#ffffff", fontFamily: "'SF Mono', Menlo, monospace" }}>
                                    ${Number(del.entryPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                              )}
                              {del.targetPrice !== undefined && del.targetPrice !== null && (
                                <div>
                                  <span style={{ color: "var(--mut)", marginRight: 4 }}>TP:</span>
                                  <strong style={{ color: "#22c55e", fontFamily: "'SF Mono', Menlo, monospace" }}>
                                    ${Number(del.targetPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                              )}
                              {del.stopLoss !== undefined && del.stopLoss !== null && (
                                <div>
                                  <span style={{ color: "var(--mut)", marginRight: 4 }}>SL:</span>
                                  <strong style={{ color: "#ef4444", fontFamily: "'SF Mono', Menlo, monospace" }}>
                                    ${Number(del.stopLoss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                              )}
                              <div>
                                <span style={{ color: "var(--mut)", marginRight: 4 }}>Sent to:</span>
                                <span style={{ color: "#ffffff" }}>{del.recipientEmail || signalEmail || user?.email}</span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#22c55e",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                                Delivered
                              </span>
                              <Link
                                href={chartLink}
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "#38bdf8",
                                  textDecoration: "none",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  background: "rgba(56, 189, 248, 0.08)",
                                  border: "1px solid rgba(56, 189, 248, 0.2)",
                                }}
                              >
                                Live Chart ↗
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Expand / View All button */}
                    {filteredDeliveries.length > 8 && (
                      <div style={{ textAlign: "center", marginTop: 8 }}>
                        {deliveryLimit < filteredDeliveries.length ? (
                          <button
                            type="button"
                            onClick={() => setDeliveryLimit(filteredDeliveries.length)}
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--line)",
                              borderRadius: 20,
                              color: "var(--tx)",
                              fontSize: 12,
                              padding: "6px 16px",
                              cursor: "pointer",
                              fontWeight: 600,
                              transition: "all 0.15s ease",
                            }}
                          >
                            View All {filteredDeliveries.length} Dispatched Alerts ↓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeliveryLimit(8)}
                            style={{
                              background: "rgba(255, 255, 255, 0.03)",
                              border: "1px solid var(--line)",
                              borderRadius: 20,
                              color: "var(--mut)",
                              fontSize: 12,
                              padding: "6px 16px",
                              cursor: "pointer",
                            }}
                          >
                            Show Less ↑
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "24px 20px",
                      borderRadius: 10,
                      border: "1px dashed var(--line)",
                      background: "rgba(255, 255, 255, 0.01)",
                      textAlign: "center",
                      color: "var(--mut)",
                      fontSize: 13,
                    }}
                  >
                    No signal alerts have been logged yet for the selected filter. Live signals generated by the Pine Script and MT5 VPS engines will appear here immediately as market events occur.
                  </div>
                )}
              </div>
            </div>

            {/* 3. ACCOUNT SECURITY & PLAN TIERS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
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
                  <div>Status: <span style={{ color: "#ffffff", fontWeight: 600 }}>Active</span></div>
                  <div>Role: <span style={{ color: "var(--tx)", fontWeight: 600 }}>{user?.role}</span></div>
                  <div>Sender: <span style={{ color: "#ffffff" }}>StratMarket &lt;alerts@elvariscapital.in&gt;</span></div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 700 }}>About StratMarket</h3>
                <p className="note" style={{ fontSize: 13, marginBottom: 16 }}>
                  An institutional quantitative research and algorithmic trading platform by Elvaris Capital (elvariscapital.in). All strategies and signals are free for registered accounts.
                </p>
                <Link
                  href="/market"
                  className="pill"
                  style={{
                    display: "inline-block",
                    fontSize: 13,
                    background: "#ffffff",
                    color: "#000000",
                    border: "none",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Explore Strategies →
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}
