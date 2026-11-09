import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedVpsOrWebhookRequest } from "@/lib/vps/security";
import { db } from "@/lib/db";
import { dispatchSignalAlertEmails } from "@/lib/email/resend";
import { z } from "zod";

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

      // 4. Trigger Resend Email Alerts to subscribers & operators (fully awaited for serverless execution)
      const strategy = await db.getStrategyBySlug(parsed.data.strategyId);
      const strategyName = strategy ? strategy.name : parsed.data.strategyId;

      let emailResult: { dispatchedCount: number; errors: string[] } = { dispatchedCount: 0, errors: [] };
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
          sourceEventId: parsed.data.sourceEventId,
          extraRecipients: result.subscriberEmails,
        });
      } catch (err) {
        console.error("[Signal Email Dispatch Failed]:", err);
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
