import {
  sendWelcomeEmail,
  sendLoginSecurityEmail,
  sendSignalAlertEmail,
  sendPasswordResetOtpEmail,
} from "../src/lib/email/resend";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const recipient = "sameetpisal@gmail.com";
  console.log(`\n======================================================`);
  console.log(`Dispatching 4 StratMarket V3 Sample Emails to: ${recipient}`);
  console.log(`Brand: StratMarket by Elvaris Capital (elvariscapital.in)`);
  console.log(`Sender: StratMarket Alerts <alerts@elvariscapital.in>`);
  console.log(`======================================================\n`);

  // Sample 1: User Signup / Welcome Email (welcome-account-created.html)
  console.log("[1/4] Dispatching V3 Welcome / Account Activation Email...");
  const welcomeRes = await sendWelcomeEmail({
    to: recipient,
    name: "Sameet Pisal",
  });
  console.log("Welcome Email Response:", welcomeRes);

  // Sample 2: Password Reset OTP Email (otp-verification.html)
  console.log("\n[2/4] Dispatching V3 Identity Verification OTP Email...");
  const otpRes = await sendPasswordResetOtpEmail({
    to: recipient,
    name: "Sameet Pisal",
    otp: "849201",
    expiresInMinutes: 10,
  });
  console.log("OTP Email Response:", otpRes);

  // Sample 3: Real-Time Live Signal Alert Email (ENTRY with Trade #)
  console.log("\n[3/5] Dispatching V3 Quantitative Trade Signal Email (ENTRY Trade #46)...");
  const signalRes = await sendSignalAlertEmail({
    to: recipient,
    strategyName: "Grandmaster Dual 10R / 8R",
    strategyId: "PS-01",
    instrument: "XAUUSD",
    timeframe: "M15",
    signalType: "ENTRY",
    direction: "LONG",
    entryPrice: 2642.50,
    stopLoss: 2628.75,
    targetPrice: 2656.50,
    tradeNumber: 46,
    timestamp: new Date(),
    sourceEventId: "vps_sig_" + Date.now(),
    winRate: "80.4%",
    profitFactor: "4.19",
    maxDrawdown: "2.0%",
  });
  console.log("Signal Email Response:", signalRes);

  // Sample 4: Trade Outcome Alert Email (TAKE PROFIT HIT 🎯 with Emoji Animation)
  console.log("\n[4/5] Dispatching V3 Trade Outcome Email (TP HIT 🎯 Trade #46)...");
  const tpHitRes = await sendSignalAlertEmail({
    to: recipient,
    strategyName: "Grandmaster Dual 10R / 8R",
    strategyId: "PS-01",
    instrument: "XAUUSD",
    timeframe: "M15",
    signalType: "TAKE_PROFIT",
    direction: "LONG",
    entryPrice: 2642.50,
    stopLoss: 2628.75,
    targetPrice: 2656.50,
    exitPrice: 2656.50,
    tradeNumber: 46,
    pnlR: "+1.02R",
    timestamp: new Date(),
    sourceEventId: "vps_tp_" + Date.now(),
  });
  console.log("TP Hit Email Response:", tpHitRes);

  // Sample 5: User Login Security Alert Email
  console.log("\n[5/5] Dispatching V3 Security Sign-in Alert Email...");
  const securityRes = await sendLoginSecurityEmail({
    to: recipient,
    name: "Sameet Pisal",
    ip: "223.233.80.43 (Mumbai, India)",
    userAgent: "Chrome 131.0.0.0 (Windows 11 x64) • StratMarket Web Client",
    time: new Date().toUTCString(),
  });
  console.log("Security Email Response:", securityRes);

  console.log(`\n======================================================`);
  console.log("All 4 StratMarket V3 sample emails dispatched successfully!");
  console.log(`======================================================\n`);
}

main().catch(console.error);
