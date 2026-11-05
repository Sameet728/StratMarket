import { sendWelcomeEmail, sendLoginSecurityEmail, sendSignalAlertEmail } from "../src/lib/email/resend";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const recipient = "sameetpisal@gmail.com";
  console.log(`\n======================================================`);
  console.log(`Dispatching 3 High-End StratMarket Sample Emails to: ${recipient}`);
  console.log(`Sender: StratMarket Alerts <alerts@elvariscapital.in>`);
  console.log(`======================================================\n`);

  // Sample 1: User Signup / Welcome Email
  console.log("[1/3] Dispatching Modern Welcome / Account Activation Email...");
  const welcomeRes = await sendWelcomeEmail({
    to: recipient,
    name: "Sameet Pisal",
  });
  console.log("Welcome Email Response:", welcomeRes);

  // Sample 2: User Login Security Alert Email
  console.log("\n[2/3] Dispatching Modern Security Login Alert Email...");
  const securityRes = await sendLoginSecurityEmail({
    to: recipient,
    name: "Sameet Pisal",
    ip: "223.233.80.43 (Mumbai, India)",
    userAgent: "Chrome 131.0.0.0 (Windows 11 x64) • StratMarket Web Client",
    time: new Date().toUTCString(),
  });
  console.log("Security Email Response:", securityRes);

  // Sample 3: Real-Time Live Signal Alert Email
  console.log("\n[3/3] Dispatching Modern Real-Time Quantitative Trade Signal Email...");
  const signalRes = await sendSignalAlertEmail({
    to: recipient,
    strategyName: "Grandmaster Dual-10R",
    strategyId: "PS-01",
    instrument: "XAUUSD",
    timeframe: "M15",
    signalType: "ENTRY",
    direction: "LONG",
    entryPrice: 3895.50,
    stopLoss: 3881.50,
    targetPrice: 3913.50,
    timestamp: new Date(),
    sourceEventId: "vps_sig_" + Date.now(),
    winRate: "82.6%",
    profitFactor: "6.11",
    maxDrawdown: "0.03%",
  });
  console.log("Signal Email Response:", signalRes);

  console.log(`\n======================================================`);
  console.log("All 3 sample emails dispatched successfully!");
  console.log(`======================================================\n`);
}

main().catch(console.error);

