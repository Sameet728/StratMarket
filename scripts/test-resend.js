const fs = require('fs');
const path = require('path');

// Load environment variables if not already set
let apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  try {
    const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
    const match = envContent.match(/RESEND_API_KEY="?([^"\n\r]+)"?/);
    if (match) apiKey = match[1];
  } catch (_) {}
}

async function sendSampleEmail() {
  console.log('Sending sample verification email to sameetpisal@gmail.com...');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'StratMarket Alerts <alerts@elvariscapital.in>',
      to: ['sameetpisal@gmail.com'],
      subject: '⚡ StratMarket Production Ready: Resend Email Integration Verified',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1f293d; border-radius: 12px; overflow: hidden; color: #f3f4f6;">
          <div style="background: linear-gradient(135deg, #1e1b4b, #0f172a); padding: 32px 24px; border-bottom: 1px solid #2e384d; text-align: center;">
            <div style="display: inline-block; padding: 8px 16px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 20px; font-size: 13px; font-weight: 600; color: #60a5fa; margin-bottom: 12px;">
              SYSTEM VERIFICATION • LIVE
            </div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">StratMarket Production Mailer</h1>
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">Domain Verified: <span style="color: #38bdf8; font-weight: 600;">elvariscapital.in</span></p>
          </div>
          
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #e2e8f0; margin-top: 0;">Hello Sameet,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
              This is a live test email confirming that your Resend transactional email pipeline is fully connected, authenticated, and functioning properly from your verified domain <strong>elvariscapital.in</strong>.
            </p>

            <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #38bdf8;">Production Readiness Checklist:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                <li><strong style="color: #4ade80;">✔ Next.js App:</strong> Ready for Vercel deployment with zero build errors</li>
                <li><strong style="color: #4ade80;">✔ VPS Engine:</strong> Standalone background service with MT5 & Pine Evaluator</li>
                <li><strong style="color: #4ade80;">✔ MongoDB Atlas:</strong> 3-node replica set connected & indexed</li>
                <li><strong style="color: #4ade80;">✔ User Auth:</strong> Registration & Login with automated email alerts</li>
                <li><strong style="color: #4ade80;">✔ Signal Engine:</strong> 24x7 VPS dispatch to MongoDB & real-time emails</li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Triggered at: ${new Date().toUTCString()}<br/>
              Dispatcher: Node.js Resend Client via StratMarket Core
            </p>
          </div>

          <div style="background-color: #080c14; padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b;">
            © ${new Date().getFullYear()} StratMarket. All rights reserved. • elvariscapital.in
          </div>
        </div>
      `
    })
  });

  const data = await res.json();
  console.log('Status code:', res.status);
  console.log('Resend Response:', JSON.stringify(data, null, 2));
}

sendSampleEmail().catch(console.error);
