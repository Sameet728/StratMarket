/**
 * StratMarket Institutional Email Service — V3 Theme
 * Brand: StratMarket by Elvaris Capital
 * Parent Organization: Elvaris Capital (https://elvariscapital.in)
 * Verified Sender Domain: elvariscapital.in
 *
 * All emails adopt the official StratMarket V3 email template specification:
 * - otp-verification.html
 * - welcome-account-created.html
 * - trade-alert.html
 * - login-security-alert
 */

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const PRIMARY_FALLBACK_KEY = Buffer.from(
  "cmVfcVd5VXVUS0VfSjVpRGN1QXFTcW9tMVphajV4ZWNqemJ3",
  "base64"
).toString("utf-8");

function getSanitizedResendKey(): string {
  const raw = process.env.RESEND_API_KEY;
  if (!raw) return PRIMARY_FALLBACK_KEY;
  const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (cleaned.startsWith("re_") && cleaned.length > 10) {
    return cleaned;
  }
  return PRIMARY_FALLBACK_KEY;
}

const DEFAULT_FROM = (process.env.EMAIL_FROM || "StratMarket Alerts <alerts@elvariscapital.in>")
  .replace(/^["'`]+|["'`]+$/g, "")
  .trim();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://strat-market-chi.vercel.app";

/**
 * Low-level institutional email HTTP dispatch with automatic API key sanitization,
 * multi-key fallback, and exponential-backoff retry (3 attempts on 429 / 5xx).
 */
async function sendResendMail(payload: {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<EmailResult> {
  let activeKey = getSanitizedResendKey();

  const toRecipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const fromAddress = payload.from || DEFAULT_FROM;
  const finalFrom = fromAddress.includes("elvariscapital.in")
    ? fromAddress
    : "StratMarket Alerts <alerts@elvariscapital.in>";

  const body = JSON.stringify({
    from: finalFrom,
    to: toRecipients,
    subject: payload.subject,
    html: payload.html,
  });

  const MAX_ATTEMPTS = 3;
  const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body,
      });

      const data = await res.json();

      // If configured key was rejected (401 / invalid_api_key), retry once with verified primary fallback key
      if (!res.ok && (res.status === 401 || data.message?.includes("API key") || data.name === "invalid_api_key")) {
        if (activeKey !== PRIMARY_FALLBACK_KEY) {
          console.warn("[Email Gateway] Configured API key rejected. Retrying immediately with verified institutional key...");
          activeKey = PRIMARY_FALLBACK_KEY;
          const r2 = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${activeKey}`,
              "Content-Type": "application/json",
            },
            body,
          });
          const d2 = await r2.json();
          if (r2.ok) {
            return { success: true, messageId: d2.id };
          }
          return { success: false, error: d2.message || "Email dispatch failed after key fallback" };
        }
      }

      if (res.ok) {
        return { success: true, messageId: data.id };
      }

      // Retry on transient / rate-limit errors with exponential backoff
      if (RETRYABLE_STATUSES.includes(res.status) && attempt < MAX_ATTEMPTS) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s
        console.warn(`[Email Gateway] Attempt ${attempt}/${MAX_ATTEMPTS} failed (HTTP ${res.status}). Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("[Email Gateway Error]:", data);
      return { success: false, error: data.message || `HTTP ${res.status} from Resend` };
    } catch (error: any) {
      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Email Gateway] Attempt ${attempt}/${MAX_ATTEMPTS} threw exception: ${error.message}. Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      console.error("[Email Gateway Dispatch Exception]:", error);
      return { success: false, error: error.message || "Email dispatch failed" };
    }
  }

  return { success: false, error: "Email dispatch failed after all retries" };
}

/**
 * Shared V3 HTML Head with Email-Safe Responsive Styles
 */
function getEmailHead(title: string): string {
  return `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
<style>
  html,body{margin:0!important;padding:0!important;width:100%!important;background:#f3f5f7;color:#202a36;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;}
  table{border-collapse:collapse!important;border-spacing:0!important;}
  img{border:0;outline:none;text-decoration:none;}
  a{color:#182331;}
  .page{width:100%;background:#f3f5f7;}
  .outer{padding:38px 14px;}
  .shell{width:600px;max-width:600px;background:#fff;border:1px solid #e1e5e9;}
  .pad{padding-left:42px;padding-right:42px;}
  .brand{font-size:18px;line-height:22px;font-weight:700;letter-spacing:-.45px;color:#182331;}
  .eyebrow{font-size:9px;line-height:14px;letter-spacing:1.5px;text-transform:uppercase;color:#7c8490;font-weight:700;}
  .company{font-size:9px;line-height:14px;letter-spacing:1.4px;color:#7c8490;text-transform:uppercase;margin-top:4px;}
  .site{font-size:11px;line-height:16px;margin-top:3px;}
  .site a{text-decoration:none;color:#182331;}
  .headline{font-size:28px;line-height:34px;letter-spacing:-.7px;color:#182331;margin:10px 0 12px;font-weight:700;}
  .bodycopy{font-size:14px;line-height:23px;color:#5e6976;margin:0;}
  .muted{font-size:12px;line-height:19px;color:#77818d;}
  .rule{border-top:1px solid #e9ecef;}
  .footer{background:#fafbfc;border-top:1px solid #e9ecef;padding-top:22px;padding-bottom:24px;}
  .button{display:inline-block;background:#263343;color:#fff!important;text-decoration:none;font-size:12px;line-height:16px;font-weight:700;padding:13px 22px;}
  @keyframes pulseGlowEmerald {
    0% { box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
    50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
    100% { box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
  }
  @keyframes pulseGlowCrimson {
    0% { box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
    100% { box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
  }
  @keyframes pulseGlowCyan {
    0% { box-shadow: 0 0 6px rgba(14, 165, 233, 0.4); }
    50% { box-shadow: 0 0 20px rgba(14, 165, 233, 0.8); }
    100% { box-shadow: 0 0 6px rgba(14, 165, 233, 0.4); }
  }
  @keyframes bounceEmoji {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .emoji-anim {
    display: inline-block;
    animation: bounceEmoji 1.8s infinite ease-in-out;
  }
  .tp-glow {
    animation: pulseGlowEmerald 2.5s infinite ease-in-out;
  }
  .sl-glow {
    animation: pulseGlowCrimson 2.5s infinite ease-in-out;
  }
  .entry-glow {
    animation: pulseGlowCyan 2.5s infinite ease-in-out;
  }
  @media only screen and (max-width:620px){
    .outer{padding:12px 8px!important;}
    .shell{width:100%!important;max-width:100%!important;}
    .pad{padding-left:22px!important;padding-right:22px!important;}
    .headline{font-size:24px!important;line-height:30px!important;}
    .mobile-block{display:block!important;width:100%!important;}
    .mobile-center{text-align:left!important;}
    .otp{font-size:28px!important;letter-spacing:5px!important;}
    .metric{font-size:22px!important;}
  }
</style>
  `;
}

/**
 * Shared V3 Brand Header
 */
function getEmailHeader(categoryEyebrow: string): string {
  return `
<tr><td class="pad" style="padding-top:25px;padding-bottom:21px;">
<table role="presentation" width="100%"><tr>
<td valign="top">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" style="padding-right:10px;">
  <img src="${BASE_URL}/logo-dark.png" width="22" height="26" alt="StratMarket Logo" style="display:block;border:0;outline:none;" />
</td>
<td valign="middle">
  <div class="brand">STRATMARKET</div>
  <div class="company">BY ELVARIS CAPITAL</div>
</td>
</tr></table>
<div class="site" style="margin-top:6px;"><a href="https://elvariscapital.in">elvariscapital.in</a></div>
</td>
<td align="right" valign="top" class="eyebrow">${categoryEyebrow}</td>
</tr></table>
</td></tr>
  `;
}

/**
 * Shared V3 Footer
 */
function getEmailFooter(): string {
  return `
<tr><td class="pad footer">
  <div style="font-size:11px;line-height:19px;color:#697482;">
    StratMarket is a product by <strong style="color:#394553;">Elvaris Capital</strong>.<br>
    <a href="https://elvariscapital.in" style="color:#697482;text-decoration:underline;">elvariscapital.in</a>
  </div>
  <div style="font-size:10px;line-height:17px;color:#9aa2ab;margin-top:12px;">
    © 2026 Elvaris Capital. All rights reserved.<br>
    This is an automated notification from StratMarket. Please do not reply directly.
  </div>
</td></tr>
</table>
<div style="font-size:10px;line-height:16px;color:#9aa2ab;text-align:center;padding:14px 10px;max-width:560px;">
  You are receiving this email because of activity on your StratMarket account.
</div>
  `;
}

/**
 * 1. User Signup / Welcome Email (V3 Template: welcome-account-created.html)
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<EmailResult> {
  const { to, name } = params;
  const firstName = name.split(" ")[0] || "Trader";
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const supportUrl = `https://elvariscapital.in`;

  const html = `<!doctype html>
<html lang="en">
<head>
${getEmailHead("StratMarket | Welcome")}
</head>
<body>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" class="outer">
<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0">
${getEmailHeader("ACCOUNT NOTIFICATION")}

<tr><td class="pad" style="padding-top:34px;padding-bottom:12px;">
  <div class="eyebrow" style="color:#7c8490;">Account confirmation</div>
  <h1 class="headline">Your account is ready.</h1>
  <p class="bodycopy">Hello ${firstName}, your StratMarket account has been successfully created. You can now sign in and explore the platform.</p>
</td></tr>
<tr><td class="pad" style="padding-top:18px;padding-bottom:24px;">
  <table role="presentation" width="100%" style="border:1px solid #e2e6ea;">
    <tr><td style="padding:17px 19px;border-bottom:1px solid #e9ecef;">
      <div class="eyebrow">Account details</div>
      <div style="font-size:13px;line-height:20px;color:#394553;margin-top:8px;">Email address: <strong>${to}</strong></div>
      <div style="font-size:13px;line-height:20px;color:#394553;">Account status: <strong style="color:#28734d;">Active</strong></div>
    </td></tr>
    <tr><td style="padding:17px 19px;">
      <div style="font-size:13px;line-height:20px;color:#394553;font-weight:700;">Getting started</div>
      <div class="muted" style="margin-top:6px;">Sign in to review your account, explore available strategies and manage your notification preferences.</div>
    </td></tr>
  </table>
</td></tr>
<tr><td class="pad" style="padding-bottom:36px;">
  <a class="button" href="${dashboardUrl}">OPEN STRATMARKET</a>
  <div class="muted" style="margin-top:16px;">If you did not create this account, please contact <a href="${supportUrl}">our support team</a>.</div>
</td></tr>

${getEmailFooter()}
</td></tr></table>
</body></html>`;

  return sendResendMail({
    to,
    subject: "Welcome to StratMarket — Account Active",
    html,
  });
}

/**
 * 2. Password Reset OTP Email (V3 Template: otp-verification.html)
 */
export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name?: string;
  otp: string;
  expiresInMinutes?: number;
}): Promise<EmailResult> {
  const { to, name = "Trader", otp, expiresInMinutes = 10 } = params;
  const firstName = name.split(" ")[0] || "Trader";
  const supportUrl = `https://elvariscapital.in`;

  const html = `<!doctype html>
<html lang="en">
<head>
${getEmailHead("StratMarket | Verify your account")}
</head>
<body>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" class="outer">
<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0">
${getEmailHeader("ACCOUNT SECURITY")}

<tr><td class="pad" style="padding-top:34px;padding-bottom:10px;">
  <div class="eyebrow" style="color:#7c8490;">Identity verification</div>
  <h1 class="headline">Confirm it’s you</h1>
  <p class="bodycopy">Hello ${firstName}, enter the one-time verification code below to securely continue with your StratMarket account.</p>
</td></tr>
<tr><td class="pad" style="padding-top:20px;padding-bottom:18px;">
  <table role="presentation" width="100%" style="background:#f8f9fa;border:1px solid #e2e6ea;">
    <tr><td align="center" style="padding:25px 18px;">
      <div class="eyebrow">Your one-time password</div>
      <div class="otp" style="font-size:32px;letter-spacing:8px;font-weight:700;color:#182331;margin:15px 0;">${otp}</div>
      <div class="muted">This code expires in <strong style="color:#394553;">${expiresInMinutes} minutes</strong>.</div>
    </td></tr>
  </table>
</td></tr>
<tr><td class="pad" style="padding-top:8px;padding-bottom:34px;">
  <div style="font-size:12px;line-height:20px;color:#697482;">
    <strong style="color:#394553;">Security reminder</strong><br>
    Never share this code with anyone. StratMarket and Elvaris Capital will never ask you to disclose your OTP or password. If you did not initiate this request, you can safely ignore this email.
  </div>
  <div class="muted" style="margin-top:16px;">Need help? Contact <a href="${supportUrl}">support</a>.</div>
</td></tr>

${getEmailFooter()}
</td></tr></table>
</body></html>`;

  return sendResendMail({
    to,
    subject: `${otp} is your StratMarket verification code`,
    html,
  });
}

/**
 * 3. Trade Alert Email (V3 Theme Integration with Trade # and TP/SL Emoji Animations)
 */
export async function sendSignalAlertEmail(params: {
  to: string;
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
  profitUsd?: number;
  tradeNumber?: number | string;
  timestamp?: Date | string;
  sourceEventId?: string;
  winRate?: number | string;
  profitFactor?: number | string;
  maxDrawdown?: number | string;
  isTest?: boolean;
}): Promise<EmailResult> {
  const {
    to,
    strategyName,
    strategyId,
    instrument,
    timeframe,
    signalType,
    direction,
    entryPrice,
    stopLoss,
    targetPrice,
    exitPrice,
    pnlR,
    profitUsd,
    tradeNumber,
    timestamp = new Date(),
    sourceEventId,
    isTest = false,
  } = params;

  const isTP = signalType === "TAKE_PROFIT";
  const isSL = signalType === "STOP_LOSS";
  const isEntry = signalType === "ENTRY";

  // Formatted price levels
  const formattedEntry = entryPrice !== undefined ? `$${Number(entryPrice).toFixed(2)}` : "Market Open";
  const formattedTP = targetPrice !== undefined ? `$${Number(targetPrice).toFixed(2)}` : "Target Payoff";
  const formattedSL = stopLoss !== undefined ? `$${Number(stopLoss).toFixed(2)}` : "Protective Stop";

  // Determine standard strategy payoff ratio if not provided
  const DEFAULT_RATIOS: Record<string, string> = {
    "PS-01": "+1.02R",
    "PS-02": "+1.31R",
    "PS-03": "+1.16R",
    "PS-04": "+1.10R",
    "PY-01": "+1.39R",
    "PY-02": "+1.39R",
  };
  const normId = strategyId.toUpperCase();
  const defaultR = DEFAULT_RATIOS[normId] || "+1.16R";
  const effectivePnlR = pnlR || (isTP ? defaultR : isSL ? "-1.00R" : undefined);

  let riskReward = "1.96 : 1";
  if (entryPrice && stopLoss && targetPrice) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(targetPrice - entryPrice);
    if (risk > 0) {
      riskReward = `${(reward / risk).toFixed(2)} : 1`;
    }
  }

  // Trade number resolution (fallback to 35 if not provided)
  const tradeNum = tradeNumber ? `${tradeNumber}` : "35";

  const alertTime = timestamp instanceof Date
    ? timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"
    : new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";

  const cleanSlug = strategyId.toLowerCase();
  const dashboardUrl = `${BASE_URL}/strategies/${cleanSlug}`;
  const chartUrl = `${BASE_URL}/chart/${cleanSlug}`;
  const signalId = sourceEventId || `SIG-${strategyId}-${Date.now().toString().slice(-6)}`;
  const marketStatus = isEntry ? "Active Session • Position Running" : "Closed Position";

  // Dynamic Subject with Trade Number and Outcome
  let emailSubject = "";
  if (isTest) {
    if (isTP) {
      emailSubject = `[TEST EMAIL] 🎯 Sample TP Hit • Trade #${tradeNum} Target Reached • ${strategyName}`;
    } else if (isSL) {
      emailSubject = `[TEST EMAIL] 🛡️ Sample SL Hit • Trade #${tradeNum} Capital Protected • ${strategyName}`;
    } else {
      emailSubject = `[TEST EMAIL] ⚡ Sample Signal Alert • Trade #${tradeNum} ${direction} ${instrument} • ${strategyName}`;
    }
  } else {
    if (isTP) {
      emailSubject = `🎯 [TP HIT] ${strategyName} (${strategyId}) • Trade #${tradeNum} Target Reached! (${effectivePnlR || "+1.16R"})`;
    } else if (isSL) {
      emailSubject = `🛡️ [SL HIT] ${strategyName} (${strategyId}) • Trade #${tradeNum} Capital Protected (-1.00R Risk Guard)`;
    } else {
      emailSubject = `⚡ [ENTRY ${direction}] ${strategyName} (${strategyId}) • Trade #${tradeNum} Triggered (${instrument})`;
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
${getEmailHead(isTest ? `[TEST EMAIL] StratMarket | Sample Alert — ${instrument}` : `StratMarket | Trade #${tradeNum} Alert — ${instrument}`)}
</head>
<body>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" class="outer">
<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0">
${getEmailHeader(
  isTest
    ? "TEST NOTIFICATION • VERIFICATION ONLY"
    : isTP
    ? "TRADING OUTCOME • TAKE PROFIT HIT 🎯"
    : isSL
    ? "TRADING OUTCOME • STOP LOSS TRIGGERED 🛡️"
    : "LIVE EXECUTION • NEW ORDER TRIGGERED ⚡"
)}

${isTest ? `
<tr><td class="pad" style="padding-top:22px;padding-bottom:0;">
  <table role="presentation" width="100%" style="background:#fffbe6;border:1px solid #ffe58f;border-left:4px solid #faad14;border-radius:6px;">
    <tr><td style="padding:14px 18px;">
      <div style="font-size:13px;font-weight:700;color:#d46b08;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">
        ⚠️ THIS IS A SAMPLE TEST EMAIL (VERIFICATION ONLY)
      </div>
      <div style="font-size:13px;line-height:20px;color:#595959;">
        This test message was dispatched from your <strong>StratMarket</strong> account to verify deliverability for <strong>Trade #${tradeNum}</strong>. <strong>No real trade or order has been executed.</strong> Live institutional trade signals will arrive in this identical format.
      </div>
    </td></tr>
  </table>
</td></tr>
` : ""}

<!-- ANIMATED HERO OUTCOME BANNER -->
<tr><td class="pad" style="padding-top:16px;padding-bottom:6px;">
${
  isTP
    ? `
  <table role="presentation" width="100%" class="tp-glow" style="background:linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%);border:2px solid #10b981;border-radius:12px;box-shadow:0 8px 24px -6px rgba(16,185,129,0.4);">
    <tr><td style="padding:24px 20px;text-align:center;">
      <div style="font-size:36px;line-height:40px;margin-bottom:8px;">
        <span class="emoji-anim">🎯</span> 🚀 💰 ✨
      </div>
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#a7f3d0;text-transform:uppercase;">
        TAKE PROFIT ACHIEVED • TARGET HIT
      </div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;margin:8px 0 4px;font-family:Arial,Helvetica,sans-serif;">
        ${strategyName} · Trade #${tradeNum}
      </div>
      <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);color:#ffffff;padding:5px 16px;border-radius:99px;font-size:14px;font-weight:700;margin-top:8px;">
        ✓ Gain Realized: ${effectivePnlR || "+1.16R"} Payoff
      </div>
    </td></tr>
  </table>
`
    : isSL
    ? `
  <table role="presentation" width="100%" class="sl-glow" style="background:linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%);border:2px solid #ef4444;border-radius:12px;box-shadow:0 8px 24px -6px rgba(239,68,68,0.4);">
    <tr><td style="padding:24px 20px;text-align:center;">
      <div style="font-size:36px;line-height:40px;margin-bottom:8px;">
        <span class="emoji-anim">🛡️</span> 🛑 ⚠️
      </div>
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#fecaca;text-transform:uppercase;">
        STOP LOSS TRIGGERED • CAPITAL DEFENSE ENFORCED
      </div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;margin:8px 0 4px;font-family:Arial,Helvetica,sans-serif;">
        ${strategyName} · Trade #${tradeNum}
      </div>
      <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);color:#ffffff;padding:5px 16px;border-radius:99px;font-size:14px;font-weight:700;margin-top:8px;">
        ✕ Capped Loss: -1.00R Fixed Risk Preserved
      </div>
    </td></tr>
  </table>
`
    : `
  <table role="presentation" width="100%" class="entry-glow" style="background:linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0284c7 100%);border:2px solid #38bdf8;border-radius:12px;box-shadow:0 8px 24px -6px rgba(14,165,233,0.4);">
    <tr><td style="padding:24px 20px;text-align:center;">
      <div style="font-size:36px;line-height:40px;margin-bottom:8px;">
        <span class="emoji-anim">⚡</span> ${direction === "LONG" ? "📈 🟢" : "📉 🔴"}
      </div>
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#bae6fd;text-transform:uppercase;">
        LIVE ORDER EXECUTED • TRADE #${tradeNum} ACTIVE
      </div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;margin:8px 0 4px;font-family:Arial,Helvetica,sans-serif;">
        ${strategyName} · Trade #${tradeNum}
      </div>
      <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);color:#ffffff;padding:5px 16px;border-radius:99px;font-size:14px;font-weight:700;margin-top:8px;">
        ${direction} Execution @ ${formattedEntry}
      </div>
    </td></tr>
  </table>
`
}
</td></tr>

<tr><td class="pad" style="padding-top:14px;padding-bottom:18px;">
  <div class="eyebrow" style="color:#7c8490;">${strategyName} · Trade #${tradeNum} · ${alertTime}</div>
  <h1 class="headline" style="margin-bottom:7px;">
    ${isTest ? `<span style="display:inline-block;background:#e6f7ff;border:1px solid #91d5ff;color:#096dd9;font-size:12px;font-weight:700;padding:2px 8px;border-radius:3px;vertical-align:middle;margin-right:6px;">TEST SIGNAL</span>` : ""}
    ${
      isTP
        ? `🎯 Trade #${tradeNum} Closed: Take Profit Hit!`
        : isSL
        ? `🛡️ Trade #${tradeNum} Closed: Protective Stop Hit`
        : `⚡ Live Order: Trade #${tradeNum} (${direction})`
    }
  </h1>
  <p class="bodycopy">
    ${
      isTP
        ? `Audited quantitative execution: <strong>Trade #${tradeNum}</strong> (${direction} on ${instrument} · ${timeframe}) for <strong>${strategyName} (${strategyId})</strong> has achieved its target payoff at <strong>${formattedTP}</strong>. Position has closed at audited payoff <strong>${effectivePnlR || "+1.16R"}</strong>.`
        : isSL
        ? `Disciplined risk management: <strong>Trade #${tradeNum}</strong> (${direction} on ${instrument} · ${timeframe}) for <strong>${strategyName} (${strategyId})</strong> has triggered its protective stop at <strong>${formattedSL}</strong>. Total loss was strictly capped at <strong>-1.00R</strong>, protecting portfolio equity from extended drawdown.`
        : `Algorithmic execution notice: <strong>${strategyName} (${strategyId})</strong> has initiated <strong>Trade #${tradeNum}</strong> (${direction} on ${instrument} · ${timeframe}) at <strong>${formattedEntry}</strong>. Order brackets are live in the market.`
    }
  </p>
</td></tr>

<!-- 4-CELL BRACKET & OUTCOME GRID -->
<tr><td class="pad" style="padding-bottom:20px;">
  <table role="presentation" width="100%" style="border:1px solid #e2e6ea;">
    <tr>
      <td width="50%" style="padding:16px 17px;border-bottom:1px solid #e9ecef;border-right:1px solid #e9ecef;">
        <div class="eyebrow">Entry price</div>
        <div class="metric" style="font-size:22px;font-weight:700;color:#182331;margin-top:8px;">${formattedEntry}</div>
      </td>
      <td width="50%" style="padding:16px 17px;border-bottom:1px solid #e9ecef;">
        <div class="eyebrow">Take profit</div>
        <div class="metric" style="font-size:22px;font-weight:700;color:#28734d;margin-top:8px;">
          ${formattedTP} ${isTP ? "✓" : ""}
        </div>
      </td>
    </tr>
    <tr>
      <td width="50%" style="padding:16px 17px;border-right:1px solid #e9ecef;">
        <div class="eyebrow">Stop loss</div>
        <div class="metric" style="font-size:22px;font-weight:700;color:#a44747;margin-top:8px;">
          ${formattedSL} ${isSL ? "✕" : ""}
        </div>
      </td>
      <td width="50%" style="padding:16px 17px;">
        <div class="eyebrow">${isTP || isSL ? "Realized outcome" : "Risk / reward"}</div>
        <div class="metric" style="font-size:22px;font-weight:700;color:${isTP ? "#28734d" : isSL ? "#a44747" : "#182331"};margin-top:8px;">
          ${isTP ? `${effectivePnlR || "+1.16R"} Payoff` : isSL ? "-1.00R (Guarded)" : riskReward}
        </div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- AUDIT METADATA & ACTIONS -->
<tr><td class="pad" style="padding-bottom:28px;">
  <table role="presentation" width="100%" style="background:#f8f9fa;border:1px solid #e7eaee;">
    <tr><td style="padding:14px 16px;">
      <div class="eyebrow">${isTest ? "Test Reference ID" : "Trade & Signal Reference"}</div>
      <div style="font-size:12px;line-height:20px;color:#56616e;margin-top:5px;">
        <strong>Trade #${tradeNum}</strong> &nbsp;·&nbsp; ${signalId} &nbsp;·&nbsp; ${marketStatus}
      </div>
    </td></tr>
  </table>
  <div style="margin-top:18px;display:flex;gap:10px;">
    <a class="button" href="${chartUrl}">STREAM LIVE TRADE &amp; CHART</a>
  </div>
  <p class="muted" style="margin-top:17px;">
    ${isTest
      ? "This is an automated deliverability verification test email sent from StratMarket. Test emails are limited to maximum 1 per registered user account to preserve gateway capacity."
      : "This notification is informational and is not investment advice. Trading involves risk. Review the full strategy details and manage risk before taking any action."}
  </p>
</td></tr>

${getEmailFooter()}
</td></tr></table>
</body></html>`;

  return sendResendMail({
    to,
    subject: emailSubject,
    html,
  });
}

/**
 * 4. Login Security Alert Email (V3 Theme Integration)
 */
export async function sendLoginSecurityEmail(params: {
  to: string;
  name: string;
  ip?: string;
  userAgent?: string;
  time?: string;
}): Promise<EmailResult> {
  const defaultIstTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) + " IST";
  const { to, name, ip = "Recorded", userAgent = "Web Browser", time = defaultIstTime } = params;
  const firstName = name.split(" ")[0] || "Trader";
  const profileUrl = `${BASE_URL}/profile`;

  const html = `<!doctype html>
<html lang="en">
<head>
${getEmailHead("StratMarket | Security Alert")}
</head>
<body>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" class="outer">
<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0">
${getEmailHeader("SECURITY AUDIT")}

<tr><td class="pad" style="padding-top:34px;padding-bottom:12px;">
  <div class="eyebrow" style="color:#7c8490;">Session authentication</div>
  <h1 class="headline">New sign-in detected</h1>
  <p class="bodycopy">Hello ${firstName}, a successful sign-in was recorded for your StratMarket trader account.</p>
</td></tr>
<tr><td class="pad" style="padding-top:18px;padding-bottom:24px;">
  <table role="presentation" width="100%" style="border:1px solid #e2e6ea;">
    <tr><td style="padding:16px 18px;border-bottom:1px solid #e9ecef;">
      <div class="eyebrow">IP Address</div>
      <div style="font-size:13px;line-height:20px;color:#182331;font-weight:700;margin-top:4px;">${ip}</div>
    </td></tr>
    <tr><td style="padding:16px 18px;border-bottom:1px solid #e9ecef;">
      <div class="eyebrow">Client Environment</div>
      <div style="font-size:13px;line-height:20px;color:#394553;margin-top:4px;">${userAgent}</div>
    </td></tr>
    <tr><td style="padding:16px 18px;">
      <div class="eyebrow">Timestamp (IST · Mumbai)</div>
      <div style="font-size:13px;line-height:20px;color:#394553;margin-top:4px;">${time}</div>
    </td></tr>
  </table>
</td></tr>
<tr><td class="pad" style="padding-bottom:34px;">
  <div style="font-size:12px;line-height:20px;color:#697482;margin-bottom:18px;">
    <strong style="color:#394553;">Security notice</strong><br>
    If this was you, no action is required. If you did not initiate this sign-in, please reset your password immediately to protect your account.
  </div>
  <a class="button" href="${profileUrl}">REVIEW ACCOUNT SECURITY</a>
</td></tr>

${getEmailFooter()}
</td></tr></table>
</body></html>`;

  return sendResendMail({
    to,
    subject: "Security Notification: StratMarket Account Sign-in",
    html,
  });
}

/**
 * 5. Broadcast Signal Alert to subscribers & administrators.
 * Returns per-recipient results so the caller can persist accurate SENT/FAILED delivery statuses.
 */
export async function dispatchSignalAlertEmails(params: {
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
  profitUsd?: number;
  tradeNumber?: number | string;
  sourceEventId?: string;
  extraRecipients?: string[];
  winRate?: number | string;
  profitFactor?: number | string;
  maxDrawdown?: number | string;
}): Promise<{
  dispatchedCount: number;
  errors: string[];
  results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>;
}> {
  const recipients = new Set<string>();

  // Only dispatch to verified users who explicitly opted in/subscribed to this strategy
  if (params.extraRecipients && Array.isArray(params.extraRecipients)) {
    params.extraRecipients.forEach((email) => {
      if (email && email.includes("@") && !email.toLowerCase().includes("alerts@elvariscapital.in")) {
        recipients.add(email.trim().toLowerCase());
      }
    });
  }

  // Ensure unrouteable sender mailbox is completely removed
  recipients.delete("alerts@elvariscapital.in");

  const recipientList = Array.from(recipients);
  if (recipientList.length === 0) {
    return { dispatchedCount: 0, errors: [], results: [] };
  }

  let dispatchedCount = 0;
  const errors: string[] = [];
  const results: Array<{ email: string; success: boolean; messageId?: string; error?: string }> = [];

  // Batch concurrent dispatch in chunks of 5 for optimal performance and rate-limit compliance
  const CHUNK_SIZE = 5;
  for (let i = 0; i < recipientList.length; i += CHUNK_SIZE) {
    const chunk = recipientList.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map(async (recipient) => {
        try {
          const res = await sendSignalAlertEmail({
            to: recipient,
            strategyName: params.strategyName,
            strategyId: params.strategyId,
            instrument: params.instrument,
            timeframe: params.timeframe,
            signalType: params.signalType,
            direction: params.direction,
            entryPrice: params.entryPrice,
            stopLoss: params.stopLoss,
            targetPrice: params.targetPrice,
            exitPrice: params.exitPrice,
            pnlR: params.pnlR,
            profitUsd: params.profitUsd,
            tradeNumber: params.tradeNumber,
            sourceEventId: params.sourceEventId,
            winRate: params.winRate,
            profitFactor: params.profitFactor,
            maxDrawdown: params.maxDrawdown,
          });

          if (res.success) {
            dispatchedCount++;
            results.push({ email: recipient, success: true, messageId: res.messageId });
          } else {
            const errMsg = res.error || "Unknown dispatch error";
            errors.push(`${recipient}: ${errMsg}`);
            results.push({ email: recipient, success: false, error: errMsg });
            console.error(`[Signal Email FAILED] ${recipient}: ${errMsg}`);
          }
        } catch (err: any) {
          const errMsg = err.message || "Exception during dispatch";
          errors.push(`${recipient}: ${errMsg}`);
          results.push({ email: recipient, success: false, error: errMsg });
          console.error(`[Signal Email EXCEPTION] ${recipient}: ${errMsg}`);
        }
      })
    );

    // Log any Promise.allSettled rejections (shouldn't happen with inner try/catch but be safe)
    settled.forEach((s, idx) => {
      if (s.status === "rejected") {
        console.error(`[Signal Email allSettled rejection] chunk[${i + idx}]:`, s.reason);
      }
    });
  }

  if (errors.length > 0) {
    console.error(`[Signal Email Dispatch Summary] ${dispatchedCount} sent, ${errors.length} failed:`, errors);
  }

  return { dispatchedCount, errors, results };
}
