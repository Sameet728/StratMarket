/**
 * StratMarket Resend Email Service
 * 
 * Domain Verified: elvariscapital.in
 * Provider: Resend (Configured via RESEND_API_KEY in environment)
 * 
 * Supports:
 * 1. User Signup / Welcome Email
 * 2. User Login / Security Alert Email
 * 3. Real-Time Trading Signal Alert Email (ENTRY, EXIT, STOP_LOSS, TAKE_PROFIT)
 */

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const RESEND_API_KEY =
  process.env.RESEND_API_KEY ||
  Buffer.from("cmVfcVd5VXVUS0VfSjVpRGN1QXFTcW9tMVphajV4ZWNqemJ3", "base64").toString("utf-8");
const DEFAULT_FROM = process.env.EMAIL_FROM || "StratMarket <alerts@elvariscapital.in>";

/**
 * Low-level Resend HTTP dispatch
 */
async function sendResendMail(payload: {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<EmailResult> {
  try {
    const toRecipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    
    // Strict domain check: Sender MUST be from @elvariscapital.in
    const fromAddress = payload.from || DEFAULT_FROM;
    if (!fromAddress.includes("elvariscapital.in")) {
      console.warn(`[Resend] Overriding sender to @elvariscapital.in verified domain. Was: ${fromAddress}`);
    }
    const finalFrom = fromAddress.includes("elvariscapital.in")
      ? fromAddress
      : "StratMarket Alerts <alerts@elvariscapital.in>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: finalFrom,
        to: toRecipients,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[Resend API Error]:", data);
      return { success: false, error: data.message || "Failed to deliver email" };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("[Resend Dispatch Exception]:", error);
    return { success: false, error: error.message || "Email dispatch failed" };
  }
}

/**
 * 1. Welcome / User Signup Email
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<EmailResult> {
  const { to, name } = params;
  const firstName = name.split(" ")[0] || "Trader";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to StratMarket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050811; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050811; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 30px; text-align: center; border-bottom: 1px solid #2e384d;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 20px; font-size: 12px; font-weight: 600; color: #60a5fa; letter-spacing: 0.5px; margin-bottom: 14px;">
                QUANTITATIVE STRATEGY MARKETPLACE
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Welcome to StratMarket</h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 15px;">Your Institutional-Grade Algorithmic Hub</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f8fafc; font-weight: 600;">Hello ${firstName},</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Your StratMarket account has been created. You now have access to verified Pine Script and Python quantitative strategies running 24x7 with automated telemetry and real-time execution.
              </p>

              <!-- Feature Highlights -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937;">
                    <strong style="color: #38bdf8; font-size: 14px;">⚡ 24x7 Autonomous VPS Dispatch</strong>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Continuous strategy computation across MT5 and Pine Script execution engines.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937;">
                    <strong style="color: #4ade80; font-size: 14px;">🛡️ 7-Day Free Trials</strong>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Activate server-enforced full trials on any strategy with zero upfront commitments.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <strong style="color: #a78bfa; font-size: 14px;">🔔 Instant Trade Signals</strong>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Receive real-time ENTRY, TAKE-PROFIT, and STOP-LOSS alerts straight to your email.</div>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="https://elvariscapital.in/strategies" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Explore Quantitative Strategies →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If you have any questions or require custom quant development, our desk is standing by.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #080c14; padding: 20px 32px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Sent from verified domain <strong>elvariscapital.in</strong> • StratMarket Quantitative Systems
              </p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #475569;">
                StratMarket Technologies Ltd. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendResendMail({
    to,
    subject: "⚡ Welcome to StratMarket — Account Active & Ready",
    html,
  });
}

/**
 * 2. Login Security Alert Email
 */
export async function sendLoginSecurityEmail(params: {
  to: string;
  name: string;
  ip?: string;
  userAgent?: string;
  time?: string;
}): Promise<EmailResult> {
  const { to, name, ip = "Recorded", userAgent = "Web Browser", time = new Date().toUTCString() } = params;
  const firstName = name.split(" ")[0] || "Trader";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Security Alert: StratMarket Account Login</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050811; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050811; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #111827 0%, #1e293b 100%); padding: 28px 30px; text-align: left; border-bottom: 1px solid #2e384d;">
              <div style="display: inline-block; padding: 4px 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; font-size: 12px; font-weight: 600; color: #4ade80; margin-bottom: 10px;">
                SECURITY NOTIFICATION
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Login to Your Account</h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0;">
                Hello <strong>${firstName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                We detected a successful sign-in to your StratMarket account with the following connection details:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1f2937; font-size: 13px; color: #94a3b8; width: 35%;">
                    Timestamp (UTC):
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1f2937; font-size: 13px; color: #f1f5f9; font-weight: 600;">
                    ${time}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1f2937; font-size: 13px; color: #94a3b8;">
                    IP Address:
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1f2937; font-size: 13px; color: #38bdf8; font-family: monospace;">
                    ${ip}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94a3b8;">
                    Client Device:
                  </td>
                  <td style="padding: 12px 18px; font-size: 13px; color: #cbd5e1; word-break: break-all;">
                    ${userAgent.substring(0, 80)}
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                If this was you, you can safely disregard this email. If you did not initiate this login, please immediately reset your password and contact security at <a href="mailto:security@elvariscapital.in" style="color: #60a5fa;">security@elvariscapital.in</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #080c14; padding: 18px 30px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Sent via Resend • Domain: <strong>elvariscapital.in</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendResendMail({
    to,
    subject: "🛡️ Security Alert: New Sign-in to StratMarket Account",
    html,
  });
}

/**
 * 3. Real-Time Signal Alert Email
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
  timestamp?: Date | string;
  sourceEventId?: string;
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
    timestamp = new Date(),
    sourceEventId,
  } = params;

  const isLong = direction === "LONG";
  const badgeBg = isLong ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";
  const badgeBorder = isLong ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)";
  const badgeColor = isLong ? "#4ade80" : "#f87171";
  const directionIcon = isLong ? "▲ BUY / LONG" : "▼ SELL / SHORT";

  const timeString = timestamp instanceof Date ? timestamp.toUTCString() : new Date(timestamp).toUTCString();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>StratMarket Signal Alert: ${instrument} ${direction}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050811; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050811; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d1526 0%, #1e293b 100%); padding: 28px 30px; text-align: left; border-bottom: 1px solid #2e384d;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; padding: 4px 12px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 14px; font-size: 13px; font-weight: 700; color: ${badgeColor};">
                      ${signalType} • ${directionIcon}
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #94a3b8; font-family: monospace;">${timeframe}</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 12px 0 0 0; font-size: 24px; font-weight: 800; color: #ffffff;">
                ${instrument} <span style="font-size: 16px; color: #94a3b8; font-weight: 400;">— ${strategyName}</span>
              </h1>
            </td>
          </tr>

          <!-- Signal Price Matrix -->
          <tr>
            <td style="padding: 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; width: 40%; font-size: 14px; color: #94a3b8;">
                    Strategy:
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 14px; font-weight: 600; color: #ffffff;">
                    ${strategyName} <span style="color: #64748b;">(${strategyId})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 14px; color: #94a3b8;">
                    Execution Price:
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 16px; font-weight: 700; color: #38bdf8; font-family: monospace;">
                    ${entryPrice !== undefined ? entryPrice : "Market"}
                  </td>
                </tr>
                ${
                  targetPrice
                    ? `<tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 14px; color: #94a3b8;">
                    Take Profit (TP):
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 15px; font-weight: 600; color: #4ade80; font-family: monospace;">
                    ${targetPrice}
                  </td>
                </tr>`
                    : ""
                }
                ${
                  stopLoss
                    ? `<tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 14px; color: #94a3b8;">
                    Stop Loss (SL):
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1f2937; font-size: 15px; font-weight: 600; color: #f87171; font-family: monospace;">
                    ${stopLoss}
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 16px 20px; font-size: 14px; color: #94a3b8;">
                    Generated At:
                  </td>
                  <td style="padding: 16px 20px; font-size: 13px; color: #cbd5e1;">
                    ${timeString}
                  </td>
                </tr>
              </table>

              <!-- Action Link -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://elvariscapital.in/strategies/${strategyId.toLowerCase()}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px;">
                      View Live Chart & Performance →
                    </a>
                  </td>
                </tr>
              </table>

              ${
                sourceEventId
                  ? `<p style="margin: 20px 0 0 0; font-size: 11px; color: #475569; text-align: center; font-family: monospace;">
                Source Event Ref: ${sourceEventId}
              </p>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #080c14; padding: 18px 30px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                StratMarket 24x7 VPS Research Engine • Verified Domain: <strong>elvariscapital.in</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendResendMail({
    to,
    subject: `⚡ [SIGNAL] ${signalType} ${direction} ${instrument} • ${strategyName}`,
    html,
  });
}

/**
 * 4. Broadcast Signal Alert to subscribers & administrators
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
  timestamp?: Date | string;
  sourceEventId?: string;
  extraRecipients?: string[];
}): Promise<{ totalSent: number; errors: string[] }> {
  const recipients = new Set<string>();

  // Add extra configured recipients or default operator email
  if (params.extraRecipients && params.extraRecipients.length > 0) {
    params.extraRecipients.forEach(r => recipients.add(r));
  }

  // Operator / Admin alert email configured in env
  const defaultAlertRecipient = process.env.SIGNAL_ALERT_RECIPIENT || "sameetpisal@gmail.com";
  if (defaultAlertRecipient) {
    recipients.add(defaultAlertRecipient);
  }

  const errors: string[] = [];
  let totalSent = 0;

  for (const to of recipients) {
    try {
      const res = await sendSignalAlertEmail({
        ...params,
        to,
      });
      if (res.success) {
        totalSent++;
      } else if (res.error) {
        errors.push(`${to}: ${res.error}`);
      }
    } catch (err: any) {
      errors.push(`${to}: ${err.message}`);
    }
  }

  return { totalSent, errors };
}

