// Quick Telegram bot test
const BOT_TOKEN = "9105786785:AAH5981BsKUxdOYCIVH-OhHIkGdhNIi3RFE";
const CHAT_ID = "1095699880";

async function testTelegram() {
  console.log("🤖 Testing Telegram Bot...");
  
  // 1. Verify bot is alive
  const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const meData = await meRes.json();
  console.log("Bot info:", JSON.stringify(meData.result, null, 2));
  
  // 2. Send test message
  const msg = `🧪 <b>StratMarket Test Alert</b>

✅ Telegram Bot Connected!

<b>Bot:</b> @Stratmarket_ElvarisCapitalBot
<b>Chat ID:</b> ${CHAT_ID}
<b>Time:</b> ${new Date().toISOString()}

You will receive live PS-01, PS-02, PS-03 trade signals here instantly when new trades are generated.

<i>This is a test message from StratMarket.</i>`;

  const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: msg,
      parse_mode: "HTML",
    }),
  });
  
  const sendData = await sendRes.json();
  
  if (sendData.ok) {
    console.log("✅ Message sent successfully! Message ID:", sendData.result.message_id);
  } else {
    console.error("❌ Failed:", sendData.description);
    if (sendData.description?.includes("chat not found")) {
      console.log("\n⚠️  You need to start the bot first!");
      console.log("   Open Telegram → search @Stratmarket_ElvarisCapitalBot → tap START");
      console.log("   Then re-run this test.");
    }
  }
}

testTelegram().catch(console.error);

