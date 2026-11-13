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

interface Mt5StrategySetting {
  enabled: boolean;
  magicNumber?: number;
  customLotSize?: number;
}

interface Mt5WebhookRelayItem {
  id: string;
  strategyId: string;
  signalType: string;
  direction: string;
  price: number;
  statusCode?: number;
  latencyMs?: number;
  success: boolean;
  error?: string;
  timestamp: string | Date;
}

interface Mt5WebhookConfig {
  id?: string;
  userId?: string;
  userEmail?: string;
  webhookUrl: string;
  secretToken?: string;
  enabled: boolean;
  strategySettings: Record<string, Mt5StrategySetting>;
  lastTriggeredAt?: string | Date;
  lastStatusCode?: number;
  lastLatencyMs?: number;
  lastError?: string;
  recentRelays?: Mt5WebhookRelayItem[];
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

  // MT5 VPS Webhook Relay State
  const [mt5Webhook, setMt5Webhook] = useState<Mt5WebhookConfig | null>(null);
  const [mt5WebhookUrl, setMt5WebhookUrl] = useState("");
  const [mt5SecretToken, setMt5SecretToken] = useState("");
  const [showSecretToken, setShowSecretToken] = useState(false);
  const [mt5Enabled, setMt5Enabled] = useState(false);
  const [mt5StrategySettings, setMt5StrategySettings] = useState<Record<string, Mt5StrategySetting>>({
    "PS-01": { enabled: true, magicNumber: 10101, customLotSize: 0.01 },
    "PS-02": { enabled: false, magicNumber: 10102, customLotSize: 0.01 },
    "PS-03": { enabled: false, magicNumber: 10103, customLotSize: 0.01 },
  });
  const [savingMt5, setSavingMt5] = useState(false);
  const [testingMt5, setTestingMt5] = useState(false);
  const [testMt5Result, setTestMt5Result] = useState<{ ok: boolean; message: string; latency?: number } | null>(null);
  const [pythonScriptCode, setPythonScriptCode] = useState("");
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Telegram Bot Alerts State
  const [telegramChatId, setTelegramChatId] = useState("1095699880");
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramBotUsername, setTelegramBotUsername] = useState("Stratmarket_ElvarisCapitalBot");
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

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
    let unmounted = false;
    async function loadData() {
      try {
        // 1. Fast Auth Check (<60ms) with 6s timeout guard - Unblock Profile UI immediately
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const meRes = await fetch("/api/auth/me", { signal: controller.signal }).catch(() => null);
        clearTimeout(timeoutId);

        if (!meRes || !meRes.ok) {
          if (!unmounted) {
            setLoading(false);
            router.push("/signin");
          }
          return;
        }

        const meData = await meRes.json().catch(() => ({}));
        if (!meData.authenticated || !meData.user) {
          if (!unmounted) {
            setLoading(false);
            router.push("/signin");
          }
          return;
        }
        if (unmounted) return;
        setUser(meData.user);
        setSignalEmail(meData.user.email);
        setLoading(false); // Instantly dismiss full-page spinner! User sees profile banner in <100ms

        // 2. Fetch entitlements, alerts, MT5 VPS trading webhook, and Telegram settings in parallel
        const [entRes, alertRes, webhookRes, tgRes] = await Promise.all([
          fetch("/api/me/entitlements"),
          fetch("/api/me/alerts"),
          fetch("/api/me/trading-webhook"),
          fetch("/api/me/telegram"),
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

        // Load MT5 VPS Webhook configuration
        try {
          const webhookData = await webhookRes.json().catch(() => ({}));
          if (webhookData?.webhook) {
            const wb = webhookData.webhook;
            setMt5Webhook(wb);
            setMt5WebhookUrl(wb.webhookUrl || "");
            setMt5SecretToken(wb.secretToken || "");
            setMt5Enabled(Boolean(wb.enabled));
            if (wb.strategySettings) {
              setMt5StrategySettings({
                "PS-01": wb.strategySettings["PS-01"] || { enabled: true, magicNumber: 10101, customLotSize: 0.01 },
                "PS-02": wb.strategySettings["PS-02"] || { enabled: false, magicNumber: 10102, customLotSize: 0.01 },
                "PS-03": wb.strategySettings["PS-03"] || { enabled: false, magicNumber: 10103, customLotSize: 0.01 },
              });
            }
          }
          if (webhookData?.pythonScript) {
            setPythonScriptCode(webhookData.pythonScript);
          }
        } catch (wbErr) {
          console.warn("Failed to load MT5 webhook config:", wbErr);
        }

        // Load Telegram preferences
        try {
          const tgData = await tgRes.json().catch(() => ({}));
          if (tgData) {
            if (tgData.chatId) setTelegramChatId(tgData.chatId);
            if (tgData.enabled !== undefined) setTelegramEnabled(Boolean(tgData.enabled));
            if (tgData.botUsername) setTelegramBotUsername(tgData.botUsername);
          }
        } catch (_) {}

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

  const handleSaveMt5Settings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingMt5(true);
    setTestMt5Result(null);
    try {
      const res = await fetch("/api/me/trading-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: mt5WebhookUrl,
          secretToken: mt5SecretToken,
          enabled: mt5Enabled,
          strategySettings: mt5StrategySettings,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMt5Webhook(data.webhook);
        if (data.pythonScript) setPythonScriptCode(data.pythonScript);
        toast.success("MT5 Settings Saved", "Your MT5 VPS Webhook configuration is now saved and active.");
      } else {
        toast.error("Save Failed", data.error || "Could not save MT5 VPS settings.");
      }
    } catch (err: any) {
      toast.error("Network Error", err.message || "Failed to reach server.");
    } finally {
      setSavingMt5(false);
    }
  };

  const handleTestMt5Handshake = async () => {
    if (!mt5WebhookUrl.trim()) {
      toast.warning("URL Required", "Please enter your MT5 VPS Webhook POST URL first.");
      return;
    }
    setTestingMt5(true);
    setTestMt5Result(null);
    try {
      const res = await fetch("/api/me/trading-webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: mt5WebhookUrl,
          secretToken: mt5SecretToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestMt5Result({
          ok: true,
          message: `Handshake successful! Response received in ${data.latencyMs}ms (HTTP ${data.statusCode}).`,
          latency: data.latencyMs,
        });
        toast.success("Handshake Verified", `VPS responded in ${data.latencyMs}ms.`);
      } else {
        setTestMt5Result({
          ok: false,
          message: data.error || "Could not connect to MT5 VPS endpoint.",
          latency: data.latencyMs,
        });
        toast.error("Handshake Failed", data.error || "Unable to reach VPS endpoint.");
      }
    } catch (err: any) {
      setTestMt5Result({
        ok: false,
        message: err.message || "Network error testing VPS handshake.",
      });
      toast.error("Connection Failed", "Network error reaching test endpoint.");
    } finally {
      setTestingMt5(false);
    }
  };

  const handleCopyPythonScript = () => {
    if (!pythonScriptCode) return;
    navigator.clipboard.writeText(pythonScriptCode).then(() => {
      setCopiedScript(true);
      toast.success("Copied to Clipboard", "Paste mt5_bridge.py onto your Windows MT5 VPS.");
      setTimeout(() => setCopiedScript(false), 3000);
    }).catch(() => {
      toast.error("Copy Failed", "Please manually select and copy the code.");
    });
  };

  // ── Telegram Handlers ─────────────────────────────────────────────────────
  const handleSaveTelegramSettings = async () => {
    setSavingTelegram(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch("/api/me/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: telegramChatId.trim(), enabled: telegramEnabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramStatusMsg({ text: "Telegram alerts saved successfully!", ok: true });
        toast.success("Telegram Connected", "Trade alerts will now be sent to your Telegram.");
      } else {
        setTelegramStatusMsg({ text: data.error || "Failed to save.", ok: false });
        toast.error("Save Failed", data.error || "Could not save Telegram settings.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTelegramStatusMsg({ text: msg, ok: false });
      toast.error("Network Error", "Failed to reach server.");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleTestTelegramAlert = async () => {
    if (!telegramChatId.trim()) {
      toast.warning("Chat ID Required", "Enter your Telegram Chat ID first. Get it from @userinfobot");
      return;
    }
    setTestingTelegram(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch("/api/me/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: telegramChatId.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramStatusMsg({ text: "✓ Test message sent! Check your Telegram.", ok: true });
        toast.success("Telegram Test Sent!", "Check your Telegram for the test alert.");
      } else {
        setTelegramStatusMsg({ text: data.error || "Failed to send test.", ok: false });
        toast.error("Test Failed", data.error || "Could not reach your Telegram chat. Make sure you started the bot first.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTelegramStatusMsg({ text: msg, ok: false });
      toast.error("Network Error", "Failed to reach server.");
    } finally {
      setTestingTelegram(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--mut)" }}>
          <div className="chart-spinner" style={{ margin: "0 auto 16px", width: 28, height: 28 }} />
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 8 }}>Loading account profile...</div>
          <div style={{ fontSize: 12, color: "#71717a" }}>
            Taking longer than usual?{" "}
            <Link href="/signin" style={{ color: "var(--lime)", textDecoration: "underline" }}>
              Sign In
            </Link>
          </div>
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

            {/* 3. TELEGRAM INSTANT ALERTS */}
            <div
              className="card profile-section-card"
              id="telegram-alerts"
              style={{
                padding: "28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #229ED9 0%, #1a7ab8 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    ✈️
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                      Telegram Instant Alerts
                    </div>
                    <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>
                      Get live trade signals directly in your Telegram
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: telegramEnabled && telegramChatId
                      ? "rgba(132, 204, 22, 0.15)"
                      : "rgba(113, 113, 122, 0.15)",
                    color: telegramEnabled && telegramChatId
                      ? "var(--lime)"
                      : "var(--mut)",
                    border: `1px solid ${telegramEnabled && telegramChatId ? "rgba(132,204,22,0.3)" : "rgba(113,113,122,0.3)"}`,
                  }}
                >
                  {telegramEnabled && telegramChatId ? "● ACTIVE" : "○ NOT CONNECTED"}
                </span>
              </div>

              {/* Setup instructions */}
              <div
                style={{
                  background: "rgba(34, 158, 217, 0.08)",
                  border: "1px solid rgba(34, 158, 217, 0.2)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--mut)",
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: "#fff", fontWeight: 600 }}>Setup in 2 steps:</span>
                <br />
                1. Open Telegram → search{" "}
                <a
                  href={`https://t.me/${telegramBotUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#229ED9", textDecoration: "none", fontWeight: 600 }}
                >
                  @{telegramBotUsername}
                </a>{" "}
                → tap <strong style={{ color: "#fff" }}>START</strong>
                <br />
                2. Message{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#229ED9", textDecoration: "none", fontWeight: 600 }}
                >
                  @userinfobot
                </a>{" "}
                to get your Chat ID → paste it below
              </div>

              {/* Chat ID Input */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--mut)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Your Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 1095699880"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {/* Enable toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    Enable Telegram Alerts
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>
                    Receive PS-01, PS-02, PS-03 trade signals instantly
                  </div>
                </div>
                <button
                  onClick={() => setTelegramEnabled(!telegramEnabled)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: telegramEnabled ? "var(--lime)" : "rgba(113,113,122,0.4)",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: telegramEnabled ? 22 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>

              {/* Status Message */}
              {telegramStatusMsg && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                    fontWeight: 500,
                    background: telegramStatusMsg.ok
                      ? "rgba(132, 204, 22, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                    border: `1px solid ${telegramStatusMsg.ok ? "rgba(132,204,22,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: telegramStatusMsg.ok ? "var(--lime)" : "#f87171",
                  }}
                >
                  {telegramStatusMsg.text}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={handleSaveTelegramSettings}
                  disabled={savingTelegram}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "11px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: savingTelegram ? "rgba(132,204,22,0.4)" : "var(--lime)",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: savingTelegram ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {savingTelegram ? (
                    <>
                      <span className="chart-spinner" style={{ width: 14, height: 14, border: "2px solid #000", borderTopColor: "transparent" }} />
                      Saving...
                    </>
                  ) : (
                    "💾 Save Settings"
                  )}
                </button>
                <button
                  onClick={handleTestTelegramAlert}
                  disabled={testingTelegram || !telegramChatId.trim()}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "11px 20px",
                    borderRadius: 8,
                    border: "1px solid rgba(34,158,217,0.4)",
                    background: "rgba(34,158,217,0.1)",
                    color: testingTelegram || !telegramChatId.trim() ? "var(--mut)" : "#229ED9",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: testingTelegram || !telegramChatId.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {testingTelegram ? (
                    <>
                      <span className="chart-spinner" style={{ width: 14, height: 14, border: "2px solid #229ED9", borderTopColor: "transparent" }} />
                      Sending...
                    </>
                  ) : (
                    "✈️ Send Test Alert"
                  )}
                </button>
              </div>
            </div>

            {/* 4. CONNECT REAL TRADING ACCOUNT • MT5 VPS WEBHOOK RELAY */}
            <div
              className="card profile-section-card"
              id="mt5-trading-relay"
              style={{
                padding: "28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 16,
                  marginBottom: 24,
                  paddingBottom: 20,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      MT5
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#ffffff" }}>
                      Connect Real Trading Account • MT5 VPS Webhook Relay
                    </h3>
                    {mt5Enabled && mt5WebhookUrl ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "#22c55e",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
                        LIVE AUTO-EXECUTION ACTIVE
                      </span>
                    ) : mt5WebhookUrl ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />
                        RELAY PAUSED / DISABLED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--mut)",
                          border: "1px solid var(--line)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#71717a" }} />
                        NOT CONFIGURED
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--mut)", maxWidth: 720, lineHeight: 1.5 }}>
                    Execute trades automatically on your own broker MT5 account (FTMO, IC Markets, Funding Pips, etc.). Whenever StratMarket generates a trade signal, our backend immediately hits your personal Windows MT5 VPS webhook POST URL with complete execution parameters.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowBridgeModal(true)}
                    className="pill sm"
                    style={{
                      fontSize: 12,
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid var(--line)",
                      color: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>⚡</span> View MT5 Python Bridge Script
                  </button>
                </div>
              </div>

              {/* Master Relay Toggle Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "16px 20px",
                  background: mt5Enabled ? "rgba(34, 197, 94, 0.05)" : "rgba(255, 255, 255, 0.02)",
                  border: `1px solid ${mt5Enabled ? "rgba(34, 197, 94, 0.25)" : "var(--line)"}`,
                  borderRadius: 12,
                  marginBottom: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 3 }}>
                    Master MT5 Webhook Automated Execution Relay
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mut)" }}>
                    {mt5Enabled
                      ? "Automated signal forwarding is ON. StratMarket will dispatch all generated trade events to your VPS."
                      : "Automated signal forwarding is paused. No HTTP POST requests will be sent to your VPS."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMt5Enabled(!mt5Enabled)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 30,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: mt5Enabled ? "1px solid #22c55e" : "1px solid var(--line)",
                    background: mt5Enabled ? "#22c55e" : "rgba(255, 255, 255, 0.06)",
                    color: mt5Enabled ? "#000000" : "var(--tx)",
                    boxShadow: mt5Enabled ? "0 0 16px rgba(34, 197, 94, 0.3)" : "none",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: mt5Enabled ? "#000" : "#71717a",
                    }}
                  />
                  {mt5Enabled ? "RELAY ENABLED" : "RELAY PAUSED"}
                </button>
              </div>

              {/* Server Connection Form */}
              <form onSubmit={handleSaveMt5Settings}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                    gap: 20,
                    marginBottom: 24,
                  }}
                >
                  {/* Webhook POST URL */}
                  <div>
                    <label
                      htmlFor="mt5WebhookUrl"
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#ffffff",
                        marginBottom: 6,
                      }}
                    >
                      MT5 VPS Webhook POST URL <span style={{ color: "var(--lime)" }}>*</span>
                    </label>
                    <input
                      id="mt5WebhookUrl"
                      type="text"
                      value={mt5WebhookUrl}
                      onChange={(e) => setMt5WebhookUrl(e.target.value)}
                      placeholder="http://your-vps-ip:5000/trade"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--line)",
                        color: "#ffffff",
                        fontSize: 13,
                        fontFamily: "monospace",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 5 }}>
                      The HTTP endpoint of your personal Windows MT5 VPS Python bridge (e.g. <code>http://123.45.67.89:5000/trade</code>).
                    </div>
                  </div>

                  {/* Secret Token */}
                  <div>
                    <label
                      htmlFor="mt5SecretToken"
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#ffffff",
                        marginBottom: 6,
                      }}
                    >
                      Secret Authorization Passphrase (Optional)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="mt5SecretToken"
                        type={showSecretToken ? "text" : "password"}
                        value={mt5SecretToken}
                        onChange={(e) => setMt5SecretToken(e.target.value)}
                        placeholder="e.g. MyVpsSecretPassphrase123"
                        style={{
                          width: "100%",
                          padding: "12px 42px 12px 14px",
                          borderRadius: 8,
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid var(--line)",
                          color: "#ffffff",
                          fontSize: 13,
                          fontFamily: "monospace",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretToken(!showSecretToken)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--mut)",
                          cursor: "pointer",
                          fontSize: 12,
                          padding: 4,
                        }}
                        title={showSecretToken ? "Hide Secret" : "Show Secret"}
                      >
                        {showSecretToken ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 5 }}>
                      StratMarket sends this in the <code>Authorization: Bearer</code> header and payload <code>secret</code> field.
                    </div>
                  </div>
                </div>

                {/* Strategy Specific Execution Controls */}
                <div style={{ marginBottom: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: "#ffffff" }}>
                      Strategy-Specific Automated Trading Controls
                    </h4>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--mut)" }}>
                      Select which strategies execute on your MT5 VPS, and customize each strategy&apos;s unique MT5 Magic Number and default lot size.
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                      gap: 16,
                    }}
                  >
                    {[
                      {
                        id: "PS-01",
                        name: "Grandmaster Dual 10R / 8R",
                        instrument: "XAUUSD · M15",
                        color: "#38bdf8",
                        defaultMagic: 10101,
                      },
                      {
                        id: "PS-02",
                        name: "US Afternoon Reversal",
                        instrument: "XAUUSD · M15",
                        color: "#f59e0b",
                        defaultMagic: 10102,
                      },
                      {
                        id: "PS-03",
                        name: "London Core Expansion",
                        instrument: "XAUUSD · M15",
                        color: "#84cc16",
                        defaultMagic: 10103,
                      },
                    ].map((strat) => {
                      const currentSetting = mt5StrategySettings[strat.id] || {
                        enabled: strat.id === "PS-01",
                        magicNumber: strat.defaultMagic,
                        customLotSize: 0.01,
                      };

                      return (
                        <div
                          key={strat.id}
                          style={{
                            padding: "16px 18px",
                            borderRadius: 12,
                            border: `1px solid ${currentSetting.enabled ? strat.color + "40" : "var(--line)"}`,
                            background: currentSetting.enabled
                              ? "rgba(255, 255, 255, 0.03)"
                              : "rgba(255, 255, 255, 0.01)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: strat.color + "20",
                                    color: strat.color,
                                    border: `1px solid ${strat.color}40`,
                                  }}
                                >
                                  {strat.id}
                                </span>
                                <span style={{ fontSize: 12, color: "var(--mut)" }}>{strat.instrument}</span>
                              </div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ffffff", marginTop: 4 }}>
                                {strat.name}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setMt5StrategySettings((prev) => ({
                                  ...prev,
                                  [strat.id]: {
                                    ...currentSetting,
                                    enabled: !currentSetting.enabled,
                                  },
                                }));
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 16,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: currentSetting.enabled ? `1px solid ${strat.color}` : "1px solid var(--line)",
                                background: currentSetting.enabled ? strat.color : "transparent",
                                color: currentSetting.enabled ? "#000000" : "var(--mut)",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {currentSetting.enabled ? "● Auto ON" : "○ Auto OFF"}
                            </button>
                          </div>

                          {/* Strategy Inputs: Magic Number & Lot Size */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>
                                Magic Number
                              </label>
                              <input
                                type="number"
                                value={currentSetting.magicNumber ?? strat.defaultMagic}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setMt5StrategySettings((prev) => ({
                                    ...prev,
                                    [strat.id]: {
                                      ...currentSetting,
                                      magicNumber: isNaN(val) ? strat.defaultMagic : val,
                                    },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "rgba(0, 0, 0, 0.3)",
                                  border: "1px solid var(--line)",
                                  color: "#ffffff",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>
                                Lot Size (Volume)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={currentSetting.customLotSize ?? 0.01}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setMt5StrategySettings((prev) => ({
                                    ...prev,
                                    [strat.id]: {
                                      ...currentSetting,
                                      customLotSize: isNaN(val) ? 0.01 : val,
                                    },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "rgba(0, 0, 0, 0.3)",
                                  border: "1px solid var(--line)",
                                  color: "#ffffff",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons & Handshake Test */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    paddingTop: 16,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      disabled={savingMt5}
                      className="pill"
                      style={{
                        padding: "10px 22px",
                        fontSize: 13,
                        fontWeight: 700,
                        background: "#ffffff",
                        color: "#000000",
                        border: "none",
                        cursor: savingMt5 ? "not-allowed" : "pointer",
                        opacity: savingMt5 ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {savingMt5 ? (
                        <>
                          <span className="chart-spinner" style={{ width: 14, height: 14 }} />
                          Saving Settings...
                        </>
                      ) : (
                        "Save MT5 VPS Settings"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestMt5Handshake}
                      disabled={testingMt5 || !mt5WebhookUrl}
                      className="pill g"
                      style={{
                        padding: "10px 18px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: testingMt5 || !mt5WebhookUrl ? "not-allowed" : "pointer",
                        opacity: !mt5WebhookUrl ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {testingMt5 ? (
                        <>
                          <span className="chart-spinner" style={{ width: 14, height: 14 }} />
                          Pinging VPS...
                        </>
                      ) : (
                        <>
                          <span>⚡</span> Send Test Handshake to VPS
                        </>
                      )}
                    </button>
                  </div>

                  {mt5Webhook?.lastTriggeredAt && (
                    <div style={{ fontSize: 11.5, color: "var(--mut)" }}>
                      Last Relay Dispatched:{" "}
                      <span style={{ color: "#ffffff" }}>
                        {formatDeliveryTime(mt5Webhook.lastTriggeredAt).formatted}
                      </span>{" "}
                      ({formatDeliveryTime(mt5Webhook.lastTriggeredAt).relative})
                    </div>
                  )}
                </div>

                {/* Test Result Callout */}
                {testMt5Result && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "12px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      background: testMt5Result.ok ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${testMt5Result.ok ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      color: testMt5Result.ok ? "#22c55e" : "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span>{testMt5Result.ok ? "✓" : "⚠️"}</span>
                    <span>{testMt5Result.message}</span>
                  </div>
                )}
              </form>

              {/* Recent MT5 VPS Relays Audit Log */}
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px", color: "#ffffff" }}>
                      Recent MT5 VPS Relays (Audit Log)
                    </h4>
                    <div style={{ fontSize: 12, color: "var(--mut)" }}>
                      Live log of trade execution signals dispatched from StratMarket to your MT5 VPS endpoint.
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "rgba(56, 189, 248, 0.1)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                    }}
                  >
                    Auto-Order Dispatcher
                  </span>
                </div>

                {mt5Webhook?.recentRelays && mt5Webhook.recentRelays.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {mt5Webhook.recentRelays.slice(0, 10).map((relay) => {
                      const timeInfo = formatDeliveryTime(relay.timestamp);
                      return (
                        <div
                          key={relay.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 10,
                            padding: "10px 14px",
                            background: "rgba(255, 255, 255, 0.015)",
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            fontSize: 12.5,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: relay.strategyId === "PS-01" ? "rgba(56, 189, 248, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: relay.strategyId === "PS-01" ? "#38bdf8" : "#f59e0b",
                              }}
                            >
                              {relay.strategyId}
                            </span>
                            <span style={{ fontWeight: 700, color: "#ffffff" }}>
                              {relay.signalType} {relay.direction}
                            </span>
                            <span style={{ color: "var(--mut)", fontFamily: "monospace" }}>
                              @ ${relay.price?.toFixed(2)}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {relay.latencyMs !== undefined && (
                              <span style={{ color: "var(--mut)", fontSize: 11, fontFamily: "monospace" }}>
                                ⚡ {relay.latencyMs}ms
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: relay.success ? "#22c55e" : "#ef4444",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: relay.success ? "#22c55e" : "#ef4444",
                                }}
                              />
                              {relay.success ? (relay.statusCode ? `HTTP ${relay.statusCode}` : "RELAYED") : (relay.error || "FAILED")}
                            </span>
                            <span style={{ color: "var(--mut)", fontSize: 11 }}>
                              {timeInfo.relative}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "20px",
                      borderRadius: 8,
                      border: "1px dashed var(--line)",
                      background: "rgba(255, 255, 255, 0.01)",
                      textAlign: "center",
                      color: "var(--mut)",
                      fontSize: 12.5,
                    }}
                  >
                    No trades have been dispatched to your MT5 VPS yet. Once configured and enabled, live trade signals generated by StratMarket will appear here instantly.
                  </div>
                )}
              </div>
            </div>

            {/* MT5 Python Bridge Script Modal */}
            {showBridgeModal && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  background: "rgba(0, 0, 0, 0.8)",
                  backdropFilter: "blur(6px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    background: "#09090b",
                    border: "1px solid var(--line)",
                    borderRadius: 16,
                    maxWidth: 780,
                    width: "100%",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>⚡</span>
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#ffffff" }}>
                          MT5 VPS Python Bridge (Auto-Trader)
                        </h3>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mut)" }}>
                        Drop this script onto your Windows VPS where MetaTrader 5 is installed to receive & execute StratMarket trades.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBridgeModal(false)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--line)",
                        color: "var(--tx)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
                    {/* Setup Instructions */}
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: 8,
                        background: "rgba(56, 189, 248, 0.06)",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                        marginBottom: 16,
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: "#e2e8f0",
                      }}
                    >
                      <strong style={{ color: "#38bdf8" }}>3-Step Setup Instructions:</strong>
                      <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        <li>Open MetaTrader 5 on your Windows VPS &rarr; Tools &rarr; Options &rarr; Expert Advisors &rarr; Check <strong>&ldquo;Allow algorithmic trading&rdquo;</strong>.</li>
                        <li>Open PowerShell / Command Prompt on your VPS and install dependencies:<br />
                          <code style={{ background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4, color: "var(--lime)" }}>pip install MetaTrader5 flask requests waitress</code>
                        </li>
                        <li>Save the script below as <code style={{ color: "#38bdf8" }}>mt5_bridge.py</code> and run: <code style={{ background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4, color: "var(--lime)" }}>python mt5_bridge.py</code>.<br />Then enter your VPS URL (e.g. <code>http://&lt;VPS_IP&gt;:5000/trade</code>) into StratMarket above.</li>
                      </ol>
                    </div>

                    {/* Script Code Preview */}
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={handleCopyPythonScript}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          zIndex: 10,
                          background: copiedScript ? "#22c55e" : "rgba(255, 255, 255, 0.12)",
                          color: copiedScript ? "#000" : "#ffffff",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {copiedScript ? "✓ Copied!" : "📋 Copy Python Script"}
                      </button>
                      <pre
                        style={{
                          background: "#000000",
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          padding: "16px",
                          color: "#38bdf8",
                          fontSize: 12,
                          fontFamily: "monospace",
                          lineHeight: 1.5,
                          overflowX: "auto",
                          maxHeight: 380,
                        }}
                      >
                        {pythonScriptCode || "Generating script..."}
                      </pre>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div
                    style={{
                      padding: "16px 24px",
                      borderTop: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCopyPythonScript}
                      className="pill"
                      style={{
                        padding: "8px 18px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: copiedScript ? "#22c55e" : "#ffffff",
                        color: "#000000",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {copiedScript ? "✓ Copied to Clipboard" : "Copy Python Bridge Code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBridgeModal(false)}
                      className="pill g"
                      style={{
                        padding: "8px 16px",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ACCOUNT SECURITY & PLAN TIERS */}
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
