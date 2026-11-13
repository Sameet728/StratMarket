import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedVpsOrWebhookRequest } from "@/lib/vps/security";
import { db } from "@/lib/db";
import { dispatchSignalAlertEmails } from "@/lib/email/resend";
import { dispatchMt5WebhookRelays } from "@/lib/trading/mt5-relay";
import { dispatchTelegramSignalAlert } from "@/lib/notifications/telegram";
import { STRATEGY_BASE_TRADES } from "@/lib/trade-lifecycle";
import { z } from "zod";

// Anti-spam & rapid-fire duplicate dispatch prevention cache
const recentDispatches = new Map<string, number>();

const SignalPayloadSchema = z.object({
  sourceEventId: z.string().min(1, "sourceEventId is required for idempotency"),
  strategyId: z.string().min(1, "strategyId is required"),
  strategyVersion: z.string().optional(),
  instrument: z.string().min(1, "instrument is required"),
  timeframe: z.string().min(1, "timeframe is required"),
  signalType: z.enum(["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"]),
  direction: z.enum(["LONG", "SHORT"]),
  timestamp: z.string().optional(),
  entryPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  targetPrice: z.number().optional(),
  signalProvenance: z.string().optional(),
});

function normalizeStrategyId(raw?: string): string {
  if (!raw) return "PS-01";
  const s = raw.trim().toUpperCase();
  if (s.includes("GRANDMASTER") || s === "PS01" || s === "PS-01" || s.includes("DUAL")) return "PS-01";
  if (s.includes("APEX") || s.includes("AFTERNOON") || s.includes("MOMENTUM") || s === "PS02" || s === "PS-02") return "PS-02";
  if (s.includes("STRICT") || s.includes("LONDON") || s.includes("EXPANSION") || s === "PS03" || s === "PS-03") return "PS-03";
  if (s.includes("ELITE") || s === "PS04" || s === "PS-04") return "PS-04";
  if (s.includes("PEAK") || s === "PY01" || s === "PY-01") return "PY-01";
  if (s.includes("SHIELD") || s.includes("HIGH-ALPHA") || s === "PY02" || s === "PY-02") return "PY-02";
  return s;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-vps-signature");
    const timestamp = request.headers.get("x-vps-timestamp");
    const authHeader = request.headers.get("authorization");
    const secretHeader =
      request.headers.get("x-secret-key") ||
      request.headers.get("x-vps-secret") ||
      request.headers.get("x-api-key");
    const querySecret =
      request.nextUrl.searchParams.get("secret") ||
      request.nextUrl.searchParams.get("key") ||
      request.nextUrl.searchParams.get("token");

    // Pre-parse JSON body to check for inline webhook secret / passphrase
    let bodyData: any = {};
    if (rawBody.trim()) {
      try {
        bodyData = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
      }
    }

    const bodySecret = bodyData.secret || bodyData.passphrase || bodyData.token || bodyData.key;

    // 1. Dual-Mode Authentication: HMAC SHA-256 (VPS runner) OR Token/Secret (TradingView / Webhooks / MT5)
    const authResult = isAuthorizedVpsOrWebhookRequest({
      rawBody,
      signature,
      timestamp,
      authHeader,
      secretHeader,
      querySecret,
      bodySecret,
    });

    if (!authResult.valid) {
      return NextResponse.json(
        {
          error: "Unauthorized signal request",
          reason: authResult.reason,
          hint: "Provide valid HMAC headers (x-vps-signature, x-vps-timestamp) or include the shared secret via header, query param (?secret=...), or JSON body (secret / passphrase).",
        },
        { status: 401 }
      );
    }

    // 2. Normalize payload for TradingView alerts & third-party webhook compatibility
    const stratId = normalizeStrategyId(bodyData.strategyId || bodyData.strategy || bodyData.strategy_id);
    const rawAction = (bodyData.action || bodyData.signalType || bodyData.order_action || bodyData.signal || "ENTRY").toString().toUpperCase().trim();
    
    let direction: "LONG" | "SHORT" = "LONG";
    if (bodyData.direction) {
      direction = bodyData.direction.toString().toUpperCase().includes("SHORT") ? "SHORT" : "LONG";
    } else if (rawAction.includes("SHORT") || rawAction.includes("SELL")) {
      direction = "SHORT";
    }

    let signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" = "ENTRY";
    if (rawAction.includes("TP") || rawAction.includes("PROFIT") || rawAction.includes("TAKE_PROFIT")) {
      signalType = "TAKE_PROFIT";
    } else if (rawAction.includes("SL") || rawAction.includes("STOP") || rawAction.includes("STOP_LOSS")) {
      signalType = "STOP_LOSS";
    } else if (rawAction.includes("EXIT") || rawAction.includes("CLOSE")) {
      signalType = "EXIT";
    } else {
      signalType = "ENTRY";
    }

    const instrument = (bodyData.instrument || bodyData.ticker || bodyData.symbol || "XAUUSD")
      .toString()
      .toUpperCase()
      .replace(/^(FOREXCOM:|OANDA:|BINANCE:|FX_IDC:)/i, "")
      .trim();

    const timeframe = (bodyData.timeframe || bodyData.interval || "M15").toString().trim();

    let entryPrice: number | undefined;
    if (typeof bodyData.entryPrice === "number") entryPrice = bodyData.entryPrice;
    else if (typeof bodyData.price === "number") entryPrice = bodyData.price;
    else if (typeof bodyData.close === "number") entryPrice = bodyData.close;
    else if (typeof bodyData.entryPrice === "string") entryPrice = parseFloat(bodyData.entryPrice);
    else if (typeof bodyData.price === "string") entryPrice = parseFloat(bodyData.price);

    let stopLoss: number | undefined;
    if (typeof bodyData.stopLoss === "number") stopLoss = bodyData.stopLoss;
    else if (typeof bodyData.sl === "number") stopLoss = bodyData.sl;

    let targetPrice: number | undefined;
    if (typeof bodyData.targetPrice === "number") targetPrice = bodyData.targetPrice;
    else if (typeof bodyData.tp === "number") targetPrice = bodyData.tp;

    const sourceEventId =
      bodyData.sourceEventId ||
      bodyData.eventId ||
      `evt_${stratId.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const normalizedPayload = {
      sourceEventId,
      strategyId: stratId,
      strategyVersion: bodyData.strategyVersion || "1.0.0",
      instrument,
      timeframe,
      signalType,
      direction,
      timestamp: bodyData.timestamp || new Date().toISOString(),
      entryPrice,
      stopLoss,
      targetPrice,
      signalProvenance: bodyData.signalProvenance || (authResult.authType === "HMAC" ? "ELVARIS_VPS_RUNNER_HMAC" : "TRADINGVIEW_WEBHOOK_DIRECT"),
    };

    const parsed = SignalPayloadSchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid signal payload structure", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // 3. Ingest signal with idempotency & notify entitled users
    try {
      const result = await db.ingestVpsSignal(parsed.data);

      // 4. Trigger Resend Email Alerts ONLY for strategies public on the UI website and only to subscribed users
      const strategy = await db.getStrategyBySlug(parsed.data.strategyId);
      const isPublicOnUi = strategy?.visibilityStatus === "PUBLIC";
      const strategyName = strategy ? strategy.name : parsed.data.strategyId;

      // Extract or compute identifiable Trade #
      const baseTrades = STRATEGY_BASE_TRADES[stratId] || 35;
      let tradeNumber: number | undefined;
      if (typeof bodyData.tradeNumber === "number") tradeNumber = bodyData.tradeNumber;
      else if (typeof bodyData.trade_number === "number") tradeNumber = bodyData.trade_number;
      else if (typeof bodyData.tradeNo === "number") tradeNumber = bodyData.tradeNo;
      else if (bodyData.tradeNumber) tradeNumber = parseInt(String(bodyData.tradeNumber), 10);
      else if (bodyData.tradeNo) tradeNumber = parseInt(String(bodyData.tradeNo), 10);

      if (!tradeNumber) {
        const existingSignals = await db.getSignals(stratId, 100);
        tradeNumber = baseTrades + Math.floor(existingSignals.length / 2) + 1;
      }

      // Check signal freshness (only send live alerts for signals generated within the last 15 minutes)
      const signalTimestampMs = parsed.data.timestamp ? new Date(parsed.data.timestamp).getTime() : Date.now();
      const signalAgeMinutes = (Date.now() - signalTimestampMs) / (1000 * 60);
      const isFreshSignal = !isNaN(signalAgeMinutes) && signalAgeMinutes >= -5 && signalAgeMinutes <= 20;

      // Anti-spam deduplication: check if exact strategy + action + tradeNumber was alerted within 60s
      const dispatchKey = `${stratId}_${parsed.data.signalType}_${tradeNumber}`;
      const lastSentTime = recentDispatches.get(dispatchKey) || 0;
      const isCooldownActive = Date.now() - lastSentTime < 60_000;

      let emailResult: { dispatchedCount: number; errors: string[]; results?: Array<{ email: string; success: boolean; messageId?: string; error?: string }> } = { dispatchedCount: 0, errors: [], results: [] };

      if (isCooldownActive) {
        console.warn(`[Signal Route] ⚠️ Suppressing rapid duplicate alert for ${dispatchKey} (sent ${((Date.now() - lastSentTime) / 1000).toFixed(1)}s ago)`);
      } else if (!isFreshSignal) {
        console.warn(`[Signal Route] ⏱️ Ingested stale historical signal (${signalAgeMinutes.toFixed(1)}m old) without email dispatch to prevent inbox spam.`);
      } else if (isPublicOnUi && result.subscriberEmails && result.subscriberEmails.length > 0) {
        recentDispatches.set(dispatchKey, Date.now());
        // Clean up old entries from recentDispatches cache
        if (recentDispatches.size > 200) {
          const cut = Date.now() - 300_000;
          for (const [k, v] of recentDispatches.entries()) {
            if (v < cut) recentDispatches.delete(k);
          }
        }

        try {
          emailResult = await dispatchSignalAlertEmails({
            strategyName,
            strategyId: parsed.data.strategyId,
            instrument: parsed.data.instrument,
            timeframe: parsed.data.timeframe,
            signalType: parsed.data.signalType,
            direction: parsed.data.direction,
            entryPrice: parsed.data.entryPrice,
            stopLoss: parsed.data.stopLoss,
            targetPrice: parsed.data.targetPrice,
            tradeNumber,
            pnlR: bodyData.pnlR || bodyData.pnl_r,
            profitUsd: typeof bodyData.profitUsd === "number" ? bodyData.profitUsd : undefined,
            sourceEventId: parsed.data.sourceEventId,
            extraRecipients: result.subscriberEmails,
          });

          // ✅ Update delivery records with REAL outcomes (SENT/FAILED) from Resend response
          if (emailResult.results && emailResult.results.length > 0) {
            db.updateDeliveryStatuses(
              emailResult.results.map(r => ({
                recipientEmail: r.email,
                signalId: result.signal.id,
                status: r.success ? "SENT" : "FAILED",
                providerMessageRef: r.messageId,
                failureReason: r.error,
                attemptCount: 1,
              }))
            ).catch(err => console.error("[Delivery Status Update Failed]:", err));
          }

          if (emailResult.errors.length > 0) {
            console.error(`[Signal Route] Email dispatch errors for signal ${result.signal.id}:`, emailResult.errors);
          }
        } catch (err) {
          console.error("[Signal Email Dispatch Failed]:", err);
          // Mark all subscriber deliveries as FAILED
          db.updateDeliveryStatuses(
            result.subscriberEmails.map(email => ({
              recipientEmail: email,
              signalId: result.signal.id,
              status: "FAILED" as const,
              failureReason: (err as any)?.message || "Dispatch exception",
              attemptCount: 1,
            }))
          ).catch(() => {});
        }
      }

      // 5. Automated Real Trading Execution: Dispatch webhook relays to connected user MT5 VPSs (only for fresh signals)
      if (isPublicOnUi && isFreshSignal && !isCooldownActive) {
        dispatchMt5WebhookRelays({
          strategyId: parsed.data.strategyId,
          strategyName,
          action: parsed.data.signalType,
          symbol: parsed.data.instrument,
          direction: parsed.data.direction,
          price: parsed.data.entryPrice || parsed.data.targetPrice || parsed.data.stopLoss || 0,
          stopLoss: parsed.data.stopLoss,
          takeProfit: parsed.data.targetPrice,
          tradeNumber,
          riskR: bodyData.pnlR || bodyData.pnl_r,
          timeframe: parsed.data.timeframe,
          sourceEventId: parsed.data.sourceEventId,
          timestamp: parsed.data.timestamp,
        }).catch((relayErr) => {
          console.error("[Signal Route] MT5 Webhook Relay Error:", relayErr);
        });
      }

      // 6. Automated Telegram Instant Alerts: Dispatch to connected Telegram users (only for fresh signals)
      if (isPublicOnUi && isFreshSignal && !isCooldownActive) {
        dispatchTelegramSignalAlert({
          strategyName,
          strategyId: parsed.data.strategyId,
          instrument: parsed.data.instrument,
          timeframe: parsed.data.timeframe,
          signalType: parsed.data.signalType,
          direction: parsed.data.direction,
          entryPrice: parsed.data.entryPrice,
          stopLoss: parsed.data.stopLoss,
          targetPrice: parsed.data.targetPrice,
          exitPrice: typeof bodyData.exitPrice === "number" ? bodyData.exitPrice : undefined,
          pnlR: bodyData.pnlR || bodyData.pnl_r,
          tradeNumber,
          timestamp: parsed.data.timestamp,
        }).catch((tgErr) => {
          console.error("[Signal Route] Telegram Dispatch Error:", tgErr);
        });
      }

      return NextResponse.json({
        success: true,
        message: "Signal ingested and processed successfully",
        signalId: result.signal.id,
        sourceEventId: result.signal.sourceEventId,
        notifiedUsersCount: result.notifiedUsersCount,
        subscriberEmails: result.subscriberEmails,
        emailDispatchedCount: emailResult.dispatchedCount,
        authMode: authResult.authType,
      });
    } catch (err: any) {
      if (err.message === "DUPLICATE_SOURCE_EVENT_ID") {
        return NextResponse.json(
          {
            error: "Duplicate sourceEventId. Signal has already been processed.",
            code: "DUPLICATE_EVENT",
          },
          { status: 409 }
        );
      }
      if (err.message === "UNKNOWN_STRATEGY_ID") {
        return NextResponse.json(
          { error: "Unknown or unapproved strategyId", code: "UNKNOWN_STRATEGY" },
          { status: 404 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.error("POST /api/internal/signals error:", error);
    return NextResponse.json({ error: "Internal signal ingestion failure" }, { status: 500 });
  }
}
