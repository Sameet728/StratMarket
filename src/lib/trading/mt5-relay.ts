import { db, WebhookRelayLogItem } from "@/lib/db";

export interface TradeSignalRelayParams {
  strategyId: string;
  strategyName: string;
  action: "ENTRY" | "EXIT" | "SL_HIT" | "TP_HIT" | "CLOSE" | string;
  symbol: string;
  direction: "LONG" | "SHORT" | "BUY" | "SELL" | string;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  tradeNumber?: number;
  riskR?: number;
  timeframe?: string;
  sourceEventId?: string;
  timestamp?: string;
}

export interface RelaySummary {
  totalTargeted: number;
  dispatched: number;
  successful: number;
  failed: number;
  details: Array<{
    userId: string;
    webhookUrl: string;
    statusCode?: number;
    latencyMs?: number;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Standard default magic numbers per strategy
 */
export const DEFAULT_STRATEGY_MAGIC_NUMBERS: Record<string, number> = {
  "PS-01": 10101,
  "PS-02": 10102,
  "PS-03": 10103,
};

/**
 * Dispatches an automated trade signal to all users who have enabled MT5 VPS Webhook Relay
 * for the given strategy.
 * 
 * Non-blocking, fault-tolerant, with strict 4s per-user timeout.
 */
export async function dispatchMt5WebhookRelays(
  signal: TradeSignalRelayParams
): Promise<RelaySummary> {
  const normalizedStrategyId = signal.strategyId.trim().toUpperCase();
  const activeWebhooks = await db.getActiveTradingWebhooksForStrategy(normalizedStrategyId);

  const summary: RelaySummary = {
    totalTargeted: activeWebhooks.length,
    dispatched: 0,
    successful: 0,
    failed: 0,
    details: [],
  };

  if (activeWebhooks.length === 0) {
    return summary;
  }

  const isBuy = signal.direction.toUpperCase().includes("BUY") || signal.direction.toUpperCase().includes("LONG");
  const orderType = signal.action.toUpperCase() === "ENTRY" 
    ? (isBuy ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL")
    : "ORDER_TYPE_CLOSE";

  const dispatchPromises = activeWebhooks.map(async (webhook) => {
    summary.dispatched++;
    const stratSetting = webhook.strategySettings?.[normalizedStrategyId] || 
                         webhook.strategySettings?.[normalizedStrategyId.replace("-", "")];

    const magicNumber = stratSetting?.magicNumber || DEFAULT_STRATEGY_MAGIC_NUMBERS[normalizedStrategyId] || 10100;
    const lotSize = stratSetting?.customLotSize && stratSetting.customLotSize > 0 ? stratSetting.customLotSize : 0.01;

    const payload = {
      event: "STRATMARKET_TRADE_SIGNAL",
      strategyId: normalizedStrategyId,
      strategyName: signal.strategyName,
      action: signal.action.toUpperCase(),
      symbol: signal.symbol.toUpperCase(),
      direction: isBuy ? "BUY" : "SELL",
      orderType,
      price: signal.price,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      tradeNumber: signal.tradeNumber,
      riskR: signal.riskR,
      timeframe: signal.timeframe || "15m",
      magicNumber,
      lotSize,
      timestamp: signal.timestamp || new Date().toISOString(),
      secret: webhook.secretToken,
      sourceEventId: signal.sourceEventId || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    const startTime = Date.now();
    let statusCode: number | undefined;
    let latencyMs: number = 0;
    let success = false;
    let errorMessage: string | undefined;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "StratMarket-SignalRelay/1.0",
      };

      if (webhook.secretToken) {
        headers["Authorization"] = `Bearer ${webhook.secretToken}`;
        headers["X-StratMarket-Secret"] = webhook.secretToken;
      }

      const response = await fetch(webhook.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000), // Strict 4-second timeout to prevent lag
      });

      latencyMs = Date.now() - startTime;
      statusCode = response.status;
      success = response.ok;

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        errorMessage = `HTTP ${response.status}: ${text.slice(0, 150) || response.statusText}`;
      }
    } catch (err: any) {
      latencyMs = Date.now() - startTime;
      if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
        errorMessage = "Relay timed out after 4000ms";
      } else {
        errorMessage = err.message || "Failed to reach user MT5 VPS endpoint";
      }
      success = false;
    }

    if (success) {
      summary.successful++;
    } else {
      summary.failed++;
    }

    summary.details.push({
      userId: webhook.userId,
      webhookUrl: webhook.webhookUrl,
      statusCode,
      latencyMs,
      success,
      error: errorMessage,
    });

    // Record relay outcome in user's profile audit history
    const outcomeItem: WebhookRelayLogItem = {
      id: "rel_" + Math.random().toString(36).substring(2, 11),
      strategyId: normalizedStrategyId,
      signalType: signal.action.toUpperCase(),
      direction: isBuy ? "BUY" : "SELL",
      price: signal.price,
      statusCode,
      latencyMs,
      success,
      error: errorMessage,
      timestamp: new Date(),
    };

    await db.recordWebhookRelayOutcome(webhook.userId, outcomeItem).catch((logErr) => {
      console.warn(`[MT5 Relay] Failed to save relay log for user ${webhook.userId}:`, logErr);
    });
  });

  // Await all dispatches in parallel
  await Promise.allSettled(dispatchPromises);
  return summary;
}

/**
 * Sends a live handshake test to verify a user's MT5 VPS endpoint reachability and latency.
 */
export async function testUserMt5Webhook(
  webhookUrl: string,
  secretToken?: string
): Promise<{
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  responseBody?: string;
  error?: string;
}> {
  const startTime = Date.now();
  let latencyMs = 0;

  try {
    const testPayload = {
      event: "STRATMARKET_TEST_HANDSHAKE",
      action: "PING",
      timestamp: new Date().toISOString(),
      message: "StratMarket MT5 VPS Webhook Handshake Test",
      version: "1.0.0",
      secret: secretToken,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "StratMarket-WebhookTester/1.0",
    };

    if (secretToken) {
      headers["Authorization"] = `Bearer ${secretToken}`;
      headers["X-StratMarket-Secret"] = secretToken;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(5000), // 5s timeout for testing
    });

    latencyMs = Date.now() - startTime;
    const bodyText = await response.text().catch(() => "");
    const preview = bodyText.slice(0, 200);

    return {
      success: response.ok,
      statusCode: response.status,
      latencyMs,
      responseBody: preview || undefined,
      error: response.ok ? undefined : `HTTP ${response.status}: ${preview || response.statusText}`,
    };
  } catch (err: any) {
    latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      error: err.name === "TimeoutError" ? "Handshake timed out after 5000ms" : (err.message || "Failed to reach endpoint"),
    };
  }
}

/**
 * Generates ready-to-run Python Flask bridge code that users can deploy on their Windows MT5 VPS.
 */
export function getMt5PythonBridgeScript(secretToken: string = ""): string {
  return `"""
StratMarket MT5 VPS Webhook Bridge (Auto-Trader)
-------------------------------------------------
Run this script on your Windows VPS where MetaTrader 5 terminal is installed.
It listens for incoming HTTP POST requests from StratMarket and executes
instant orders using the official MetaTrader5 Python package.

Prerequisites:
  1. Open MetaTrader 5 on your VPS and log in to your trading broker account.
  2. In MT5: Tools -> Options -> Expert Advisors -> Check "Allow algorithmic trading".
  3. Install dependencies in Command Prompt / PowerShell:
       pip install MetaTrader5 flask requests waitress

Run in production on your VPS:
  python mt5_bridge.py
"""

from flask import Flask, request, jsonify
import MetaTrader5 as mt5
import sys
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Secret passphrase configured in your StratMarket profile (optional, leave empty if not used)
EXPECTED_SECRET = "${secretToken || "YOUR_SECRET_TOKEN"}"

def initialize_mt5():
    if not mt5.initialize():
        logging.error(f"mt5.initialize() failed, error code: {mt5.last_error()}")
        return False
    account_info = mt5.account_info()
    if account_info is None:
        logging.error("Failed to get MT5 account info")
        return False
    logging.info(f"Connected to MT5 Account: {account_info.login} ({account_info.server})")
    return True

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "active", "service": "StratMarket MT5 Bridge"}), 200

@app.route("/trade", methods=["POST"])
@app.route("/webhook", methods=["POST"])
def handle_trade():
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({"error": "Invalid JSON", "details": str(e)}), 400

    # Verify secret token if enabled
    if EXPECTED_SECRET and EXPECTED_SECRET != "YOUR_SECRET_TOKEN":
        auth_header = request.headers.get("Authorization", "").replace("Bearer ", "")
        sec_header = request.headers.get("X-StratMarket-Secret", "")
        body_secret = data.get("secret", "")
        if auth_header != EXPECTED_SECRET and sec_header != EXPECTED_SECRET and body_secret != EXPECTED_SECRET:
            logging.warning("Unauthorized webhook request received")
            return jsonify({"error": "Unauthorized"}), 401

    event = data.get("event")
    if event == "STRATMARKET_TEST_HANDSHAKE" or data.get("action") == "PING":
        logging.info("Handshake ping received successfully")
        return jsonify({
            "status": "success",
            "message": "StratMarket MT5 VPS Handshake OK",
            "connected_to_mt5": mt5.terminal_info() is not None
        }), 200

    action = data.get("action", "").upper()
    symbol = data.get("symbol", "XAUUSD").upper()
    direction = data.get("direction", "").upper()
    lot_size = float(data.get("lotSize", 0.01))
    magic_number = int(data.get("magicNumber", 10101))
    sl = float(data["stopLoss"]) if data.get("stopLoss") else None
    tp = float(data["takeProfit"]) if data.get("takeProfit") else None
    trade_num = data.get("tradeNumber", 0)

    # Re-initialize MT5 if disconnected
    if not mt5.terminal_info():
        initialize_mt5()

    # Find the broker's exact symbol name (handles symbols like XAUUSDm, XAUUSD.pro, GOLD)
    selected_symbol = symbol
    if not mt5.symbol_select(symbol, True):
        # Search for matching symbols
        all_symbols = [s.name for s in mt5.symbols_get()]
        matches = [s for s in all_symbols if symbol in s]
        if matches:
            selected_symbol = matches[0]
            mt5.symbol_select(selected_symbol, True)
        else:
            return jsonify({"error": f"Symbol {symbol} not found in MT5"}), 404

    # Handle ENTRY signals
    if action == "ENTRY":
        tick = mt5.symbol_info_tick(selected_symbol)
        if not tick:
            return jsonify({"error": f"Could not retrieve tick for {selected_symbol}"}), 500

        is_buy = ("BUY" in direction or "LONG" in direction)
        order_type = mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL
        price = tick.ask if is_buy else tick.bid

        order_request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": selected_symbol,
            "volume": lot_size,
            "type": order_type,
            "price": price,
            "magic": magic_number,
            "comment": f"SM #{trade_num}",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        if sl:
            order_request["sl"] = sl
        if tp:
            order_request["tp"] = tp

        result = mt5.order_send(order_request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logging.error(f"OrderSend failed: retcode={result.retcode}, comment={result.comment}")
            return jsonify({
                "status": "failed",
                "retcode": result.retcode,
                "comment": result.comment
            }), 400

        logging.info(f"Order #{result.order} opened: {selected_symbol} {'BUY' if is_buy else 'SELL'} {lot_size} lots at {price}")
        return jsonify({
            "status": "success",
            "order": result.order,
            "volume": result.volume,
            "price": result.price,
            "retcode": result.retcode
        }), 200

    # Handle CLOSE / EXIT / SL_HIT / TP_HIT signals
    elif action in ["EXIT", "CLOSE", "SL_HIT", "TP_HIT"]:
        # Find open positions for this symbol & magic number
        positions = mt5.positions_get(symbol=selected_symbol)
        closed_count = 0
        if positions:
            for pos in positions:
                if pos.magic == magic_number:
                    tick = mt5.symbol_info_tick(selected_symbol)
                    close_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
                    close_price = tick.bid if pos.type == mt5.ORDER_TYPE_BUY else tick.ask
                    close_request = {
                        "action": mt5.TRADE_ACTION_DEAL,
                        "symbol": selected_symbol,
                        "position": pos.ticket,
                        "volume": pos.volume,
                        "type": close_type,
                        "price": close_price,
                        "magic": magic_number,
                        "comment": f"SM Close #{trade_num}",
                        "type_time": mt5.ORDER_TIME_GTC,
                        "type_filling": mt5.ORDER_FILLING_IOC,
                    }
                    mt5.order_send(close_request)
                    closed_count += 1
        return jsonify({"status": "success", "closed_positions": closed_count}), 200

    return jsonify({"status": "ignored", "message": f"Action {action} handled"}), 200

if __name__ == "__main__":
    if not initialize_mt5():
        print("CRITICAL: Failed to connect to MetaTrader 5. Please ensure MT5 is running.")
        sys.exit(1)
    
    print("-------------------------------------------------------")
    print("StratMarket MT5 Bridge running on http://0.0.0.0:5000")
    print("Configure your profile webhook URL as: http://<VPS_IP>:5000/trade")
    print("-------------------------------------------------------")
    from waitress import serve
    serve(app, host="0.0.0.0", port=5000)
`;
}
