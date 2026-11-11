/**
 * StratMarket Browser Push Notification System
 * Enables real-time desktop & mobile Chrome/browser notifications for trade signals, TP, and SL.
 */

export interface TradeNotificationPayload {
  strategyName: string;
  strategyId: string;
  tradeNumber?: number | string;
  signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | string;
  direction: "LONG" | "SHORT" | string;
  instrument?: string;
  entryPrice?: number;
  exitPrice?: number;
  pnlR?: string;
}

const BROWSER_ALERT_STORAGE_KEY = "stratmarket_browser_alerts_enabled";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserAlertPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BROWSER_ALERT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setBrowserAlertPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BROWSER_ALERT_STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    if (Notification.permission === "granted") {
      setBrowserAlertPreference(true);
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setBrowserAlertPreference(granted);
      return granted;
    }

    return false;
  } catch (err) {
    console.warn("Failed to request browser notification permission:", err);
    return false;
  }
}

/**
 * Synthesizes a gentle institutional audio chime using Web Audio API
 */
export function playChime(type: "tp" | "entry" | "sl") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);

    if (type === "tp") {
      // Upbeat double chime: E5 (659Hz) -> A5 (880Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880.0, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "entry") {
      // Crisp signal ping: D5 (587Hz)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Muted defensive alert: C4 (261Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(261.63, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (_) {
    // Audio context might be restricted before user gesture
  }
}

/**
 * Fires a desktop Chrome / browser notification
 */
export function sendBrowserTradeNotification(data: TradeNotificationPayload): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!getBrowserAlertPreference()) return;

  const tradeNum = data.tradeNumber ? `Trade #${data.tradeNumber}` : "Live Trade";
  const instrument = data.instrument || "XAUUSD";

  let title = "";
  let body = "";
  let chimeType: "tp" | "entry" | "sl" = "entry";

  if (data.signalType === "TAKE_PROFIT") {
    title = `🎯 TAKE PROFIT HIT • ${data.strategyName}`;
    body = `${tradeNum}: Target achieved (${data.pnlR || "+1.16R"})! Position closed in profit.`;
    chimeType = "tp";
  } else if (data.signalType === "STOP_LOSS") {
    title = `🛡️ STOP LOSS TRIGGERED • ${data.strategyName}`;
    body = `${tradeNum}: Sovereign stop loss touched. Total loss capped at -1.00R.`;
    chimeType = "sl";
  } else {
    title = `⚡ NEW ORDER • ${data.strategyName} (${tradeNum})`;
    body = `${data.direction} order placed on ${instrument} @ $${data.entryPrice?.toFixed(2) || "market"}. Order brackets active.`;
    chimeType = "entry";
  }

  try {
    playChime(chimeType);
    const notif = new Notification(title, {
      body,
      icon: "/logo-dark.png",
      tag: `trade_${data.strategyId}_${Date.now()}`,
    });

    notif.onclick = () => {
      window.focus();
      window.location.href = `/chart/${data.strategyId.toLowerCase()}`;
    };
  } catch (err) {
    console.warn("Error displaying browser notification:", err);
  }
}

