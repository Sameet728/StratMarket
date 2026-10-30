import { NextRequest, NextResponse } from "next/server";
import { verifyVpsSignature } from "@/lib/vps/security";
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

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-vps-signature");
    const timestamp = request.headers.get("x-vps-timestamp");

    // 1. Verify HMAC Signature and replay timestamp skew
    const authResult = verifyVpsSignature(rawBody, signature, timestamp);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: "Unauthorized VPS request", reason: authResult.reason },
        { status: 401 }
      );
    }

    // 2. Parse & Validate JSON payload
    let bodyData: any;
    try {
      bodyData = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    const parsed = SignalPayloadSchema.safeParse(bodyData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid signal payload structure", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // 3. Ingest signal with idempotency & notify entitled users
    try {
      const result = await db.ingestVpsSignal(parsed.data);

      // 4. Trigger Resend Email Alerts to subscribers & operators asynchronously
      const strategy = await db.getStrategyBySlug(parsed.data.strategyId);
      const strategyName = strategy ? strategy.name : parsed.data.strategyId;

      dispatchSignalAlertEmails({
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
      }).catch((err) => {
        console.error("[Signal Email Dispatch Failed]:", err);
      });

      return NextResponse.json({
        success: true,
        message: "Signal ingested and processed successfully",
        signalId: result.signal.id,
        sourceEventId: result.signal.sourceEventId,
        notifiedUsersCount: result.notifiedUsersCount,
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
