/**
 * Dispatches sample emails for all 3 categories to sameetpisal@gmail.com:
 * 1. User Signup / Welcome Email
 * 2. User Login Security Alert Email
 * 3. Real-Time Trading Signal Generated Alert Email
 * 
 * Sender: StratMarket Alerts <alerts@elvariscapital.in>
 * Verified Domain: elvariscapital.in
 */

const fs = require('fs');
const path = require('path');

let RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  try {
    const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
    const match = envContent.match(/RESEND_API_KEY="?([^"\n\r]+)"?/);
    if (match) RESEND_API_KEY = match[1];
  } catch (_) {}
}
const TARGET_EMAIL = 'sameetpisal@gmail.com';
const SENDER = 'StratMarket Alerts <alerts@elvariscapital.in>';

async function sendMail(subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: SENDER,
      to: [TARGET_EMAIL],
      subject,
      html,
    }),
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log(`Sending 3 transactional sample emails to ${TARGET_EMAIL} from ${SENDER}...\n`);

  // 1. SIGNUP / WELCOME EMAIL
  console.log('[1/3] Sending User Signup / Welcome Email...');
  const welcomeHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 14px; overflow: hidden; color: #f1f5f9;">
    <div style="background: linear-gradient(135deg, #0f172a, #1e1b4b); padding: 32px 24px; text-align: center; border-bottom: 1px solid #2e384d;">
      <span style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 20px; font-size: 12px; font-weight: 600; color: #60a5fa; margin-bottom: 12px;">
        TRANSACTIONAL EMAIL • SAMPLE 1: SIGNUP
      </span>
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff;">Welcome to StratMarket</h1>
      <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">Your Account is Activated & Ready</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; color: #e2e8f0; margin-top: 0;">Hello Sameet,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        Welcome to StratMarket! Your registration is complete. You can now explore institutional quantitative strategies, test 7-day server-enforced full trials, and receive live 24x7 VPS signals.
      </p>
      <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #38bdf8; font-size: 13px; text-transform: uppercase;">Quick Access:</h4>
        <ul style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 13px; line-height: 1.8;">
          <li>Explore 14+ public quantitative strategies</li>
          <li>Connect TradingView charts & MT5 data feeds</li>
          <li>Activate real-time email & webhook notifications</li>
        </ul>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
        Sent via Resend • Verified Domain: <strong>elvariscapital.in</strong>
      </p>
    </div>
  </div>
  `;
  const res1 = await sendMail('⚡ Welcome to StratMarket — Account Active & Ready (Sample 1/3)', welcomeHtml);
  console.log('Welcome Email Result:', res1);

  // 2. LOGIN SECURITY ALERT EMAIL
  console.log('\n[2/3] Sending User Login / Security Alert Email...');
  const loginHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 14px; overflow: hidden; color: #f1f5f9;">
    <div style="background: linear-gradient(135deg, #111827, #1e293b); padding: 28px 24px; text-align: left; border-bottom: 1px solid #2e384d;">
      <span style="display: inline-block; padding: 4px 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; font-size: 12px; font-weight: 600; color: #4ade80; margin-bottom: 10px;">
        SECURITY NOTIFICATION • SAMPLE 2: LOGIN
      </span>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Login to StratMarket</h1>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; color: #e2e8f0; margin-top: 0;">Hello Sameet,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
        A successful login was recorded on your StratMarket account with the following details:
      </p>
      <table style="width: 100%; background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; margin: 18px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">Time:</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; color: #ffffff; font-size: 13px; font-weight: 600;">${new Date().toUTCString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">IP Address:</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; color: #38bdf8; font-size: 13px; font-family: monospace;">103.212.144.10 (Mumbai, IN)</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #94a3b8; font-size: 13px;">Device / Browser:</td>
          <td style="padding: 10px 14px; color: #cbd5e1; font-size: 13px;">Chrome 122.0 / Windows 11 Desktop</td>
        </tr>
      </table>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
        If you did not initiate this login, please contact security@elvariscapital.in immediately.
      </p>
    </div>
  </div>
  `;
  const res2 = await sendMail('🛡️ Security Alert: New Sign-in to StratMarket (Sample 2/3)', loginHtml);
  console.log('Login Email Result:', res2);

  // 3. REAL-TIME SIGNAL GENERATED ALERT EMAIL
  console.log('\n[3/3] Sending Real-Time Trading Signal Generated Alert Email...');
  const signalHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 14px; overflow: hidden; color: #f1f5f9;">
    <div style="background: linear-gradient(135deg, #0d1526, #1e293b); padding: 28px 24px; text-align: left; border-bottom: 1px solid #2e384d;">
      <div style="display: inline-block; padding: 4px 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 14px; font-size: 13px; font-weight: 700; color: #4ade80; margin-bottom: 8px;">
        ENTRY • ▲ BUY / LONG (SAMPLE 3: SIGNAL)
      </div>
      <h1 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800; color: #ffffff;">
        XAUUSD <span style="font-size: 16px; color: #94a3b8; font-weight: 400;">— Institutional Gold Mean Reversion (PY-03)</span>
      </h1>
    </div>
    <div style="padding: 28px 24px;">
      <table style="width: 100%; background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; margin-bottom: 20px; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">Instrument / Pair:</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #ffffff; font-size: 13px; font-weight: 700;">XAUUSD (Gold / US Dollar)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">Timeframe:</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #ffffff; font-size: 13px; font-weight: 600;">H1 (1-Hour)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">Execution Price:</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #38bdf8; font-size: 16px; font-weight: 700; font-family: monospace;">$2,658.75</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">Take Profit (TP):</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #4ade80; font-size: 15px; font-weight: 700; font-family: monospace;">$2,689.50 (+1.15%)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #94a3b8; font-size: 13px;">Stop Loss (SL):</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1f2937; color: #f87171; font-size: 15px; font-weight: 700; font-family: monospace;">$2,642.00 (-0.63%)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Provenance:</td>
          <td style="padding: 12px 16px; color: #cbd5e1; font-size: 12px; font-family: monospace;">ELVARIS_VPS_MT5_ENGINE</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://elvariscapital.in/strategies/py-03" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px;">
          View Live Performance & Chart →
        </a>
      </div>

      <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 0;">
        Automated Dispatch by 24x7 VPS Engine • Domain: <strong>elvariscapital.in</strong>
      </p>
    </div>
  </div>
  `;
  const res3 = await sendMail('⚡ [SIGNAL] ENTRY LONG XAUUSD • Institutional Gold Mean Reversion (Sample 3/3)', signalHtml);
  console.log('Signal Alert Email Result:', res3);

  console.log('\n======================================================');
  console.log('🎉 ALL 3 SAMPLE EMAILS DISPATCHED SUCCESSFULLY VIA RESEND!');
  console.log('======================================================');
}

run().catch(console.error);
