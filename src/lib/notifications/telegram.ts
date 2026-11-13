import { db } from "@/lib/db";

const DEFAULT_BOT_TOKEN = "9105786785:AAH5981BsKUxdOYCIVH-OhHIkGdhNIi3RFE";
const DEFAULT_BOT_USERNAME = "Stratmarket_ElvarisCapitalBot";

export function getTelegramBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
}

export function getTelegramBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME || DEFAULT_BOT_USERNAME;
}

export interface TelegramSendResult {
  success: boolean;
  statusCode?: number;
  messageId?: number;
  error?: string;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: "Markdown" | "HTML"; disableWebPagePreview?: boolean }
): Promise<TelegramSendResult> {
  const token = getTelegramBotToken();
  const cleanChatId = chatId.trim();

  if (!cleanChatId) {
    return { success: false, error: "Telegram Chat ID is empty." };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: options?.parseMode || "HTML",
        disable_web_page_preview: options?.disableWebPagePreview ?? false,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      return {
        success: true,
        statusCode: res.status,
        messageId: data.result?.message_id,
      };
    }

    let errorMsg = data.description || `HTTP ${res.status}`;
    if (errorMsg.includes("chat not found")) {
      errorMsg = `Chat ID ${cleanChatId} not found. Please open @${getTelegramBotUsername()} in Telegram, click START, and try again.`;
    } else if (errorMsg.includes("bot was blocked")) {
      errorMsg = `The bot was blocked by the user. Please unblock @${getTelegramBotUsername()} in Telegram.`;
    }

    return {
      success: false,
      statusCode: res.status,
      error: errorMsg,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === "TimeoutError" ? "Telegram API request timed out." : err.message || "Failed to reach Telegram API.",
    };
  }
}

export async function sendTestTelegramAlert(
  chatId: string,
  userEmail?: string
): Promise<TelegramSendResult> {
  const istTime = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) + " IST";

  const message = `<b>⚡ StratMarket Telegram Notifications Active!</b>

Hello! Your account <code>${userEmail || "Trader"}</code> has been successfully connected to <b>StratMarket</b>.

<b>Notification Settings:</b>
• <b>Channel:</b> Telegram Instant Signals
• <b>Chat ID:</b> <code>${chatId}</code>
• <b>Time:</b> ${istTime}
• <b>Scope:</b> Real-time trade entries, target payoffs (TP), and capital defense (SL)

<i>You will now receive instant alerts on this Telegram chat as soon as institutional trades trigger.</i>

🔗 <a href="https://stratmarket.elvariscapital.in/dashboard">Open StratMarket Dashboard</a>`;

  return sendTelegramMessage(chatId, message, { parseMode: "HTML" });
}

export async function dispatchTelegramSignalAlert(params: {
  strategyName: string;
  strategyId: string;
  instrument: string;
  timeframe: string;
  signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT";
  direction: "LONG" | "SHORT";
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  exitPrice?: number;
  pnlR?: string;
  tradeNumber?: number | string;
  timestamp?: string | Date;
}): Promise<{ dispatchedCount: number; errors: string[] }> {
  const recipients = await db.getAllActiveTelegramRecipients(params.strategyId);

  if (recipients.length === 0) {
    return { dispatchedCount: 0, errors: [] };
  }

  const isTP = params.signalType === "TAKE_PROFIT";
  const isSL = params.signalType === "STOP_LOSS";
  const isEntry = params.signalType === "ENTRY";

  const timeStr = (params.timestamp ? new Date(params.timestamp) : new Date()).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }) + " IST";

  const cleanSlug = params.strategyId.toLowerCase();
  const chartUrl = `https://stratmarket.elvariscapital.in/chart/${cleanSlug}`;

  let messageText = "";

  if (isTP) {
    messageText = `🎯 <b>[TAKE PROFIT HIT] ${params.strategyName} (${params.strategyId})</b>
Trade #${params.tradeNumber || "Active"} • ${params.instrument} · ${params.timeframe}

🏆 <b>Outcome: Target Reached!</b>
💵 <b>Exit Price:</b> $${params.exitPrice ? Number(params.exitPrice).toFixed(2) : params.targetPrice ? Number(params.targetPrice).toFixed(2) : "Target Hit"}
💰 <b>Gain Realized:</b> <code>${params.pnlR || "+1.02R"}</code> Payoff
⏱️ <b>Time:</b> ${timeStr}

🔗 <a href="${chartUrl}">Stream Live Chart</a>`;
  } else if (isSL) {
    messageText = `🛡️ <b>[STOP LOSS HIT] ${params.strategyName} (${params.strategyId})</b>
Trade #${params.tradeNumber || "Active"} • ${params.instrument} · ${params.timeframe}

🛑 <b>Outcome: Capital Defense Enforced</b>
💵 <b>Exit Price:</b> $${params.exitPrice ? Number(params.exitPrice).toFixed(2) : params.stopLoss ? Number(params.stopLoss).toFixed(2) : "Stop Hit"}
🔒 <b>Capped Loss:</b> <code>-1.00R</code> Fixed Risk Preserved
⏱️ <b>Time:</b> ${timeStr}

🔗 <a href="${chartUrl}">Stream Live Chart</a>`;
  } else {
    const isLong = params.direction === "LONG";
    const dirEmoji = isLong ? "🟢 LONG (BUY)" : "🔴 SHORT (SELL)";

    messageText = `⚡ <b>[NEW TRADE TRIGGERED] ${params.strategyName} (${params.strategyId})</b>
Trade #${params.tradeNumber || "Active"} • ${params.instrument} · ${params.timeframe}

📈 <b>Action:</b> ${dirEmoji}
💵 <b>Entry Price:</b> $${params.entryPrice ? Number(params.entryPrice).toFixed(2) : "Market Open"}
🛡️ <b>Stop Loss:</b> $${params.stopLoss ? Number(params.stopLoss).toFixed(2) : "Calculated"} (-1.00R)
🎯 <b>Take Profit:</b> $${params.targetPrice ? Number(params.targetPrice).toFixed(2) : "Calculated"} (${params.pnlR || "+1.02R"})
⏱️ <b>Time:</b> ${timeStr}

🔗 <a href="${chartUrl}">Stream Live Chart</a>`;
  }

  const errors: string[] = [];
  let dispatchedCount = 0;

  const promises = recipients.map(async (r) => {
    const res = await sendTelegramMessage(r.chatId, messageText, { parseMode: "HTML" });
    if (res.success) {
      dispatchedCount++;
    } else {
      errors.push(`Telegram send to ${r.userEmail || r.chatId} failed: ${res.error}`);
    }
  });

  await Promise.allSettled(promises);
  return { dispatchedCount, errors };
}

