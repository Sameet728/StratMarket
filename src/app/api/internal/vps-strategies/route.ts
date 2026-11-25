// GET /api/internal/vps-strategies
// HMAC / Secret-authenticated endpoint: returns all PUBLIC PINE_SCRIPT strategies with their Pine params.
// VPS polls this endpoint every 60s to hot-reload its active Pine strategies dynamically.

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedVpsOrWebhookRequest } from "@/lib/vps/security";
import { db } from "@/lib/db";

function toTradingViewTimeframe(tf: string): string {
  const upper = (tf || "M15").trim().toUpperCase();
  if (upper === "M1") return "1";
  if (upper === "M3") return "3";
  if (upper === "M5") return "5";
  if (upper === "M15") return "15";
  if (upper === "M30") return "30";
  if (upper === "H1") return "60";
  if (upper === "H2") return "120";
  if (upper === "H4") return "240";
  if (upper === "D1") return "1D";
  return upper.replace(/^M/i, "");
}

export async function GET(request: NextRequest) {
  const signature = request.headers.get("x-vps-signature");
  const timestamp = request.headers.get("x-vps-timestamp");
  const authHeader = request.headers.get("authorization");
  const secretHeader =
    request.headers.get("x-secret-key") ||
    request.headers.get("x-vps-secret") ||
    request.headers.get("x-internal-key") ||
    request.headers.get("x-api-key");
  const querySecret =
    request.nextUrl.searchParams.get("secret") ||
    request.nextUrl.searchParams.get("key") ||
    request.nextUrl.searchParams.get("token");

  const authResult = isAuthorizedVpsOrWebhookRequest({
    rawBody: "",
    signature,
    timestamp,
    authHeader,
    secretHeader,
    querySecret,
  });

  if (!authResult.valid) {
    return NextResponse.json(
      { error: "Unauthorized", reason: authResult.reason },
      { status: 401 }
    );
  }

  try {
    const allStrategies = await db.getAllStrategiesAdmin();
    const pineStrategies = allStrategies.filter(
      (s) => s.implementationType === "PINE_SCRIPT" && s.visibilityStatus === "PUBLIC"
    );

    const result = pineStrategies.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      instrument: s.instrument,
      timeframe: toTradingViewTimeframe(s.timeframe),
      version: s.currentVersion || "1.0.0",
      pineScriptCode: s.pineScriptCode || undefined,
      bandLength: s.pineParams?.bandLength ?? 28,
      bandMult: s.pineParams?.bandMult ?? 2.1,
      emaMacroLen: s.pineParams?.emaMacroLen ?? 200,
      emaFastLen: s.pineParams?.emaFastLen ?? 50,
      atrLen: s.pineParams?.atrLen ?? 14,
      offsetVal: s.pineParams?.offsetVal ?? 4.0,
      crashFilterAtr: s.pineParams?.crashFilterAtr ?? 1.25,
      rsiLen: s.pineParams?.rsiLen ?? 14,
      rsiLongThresh: s.pineParams?.rsiLongThresh ?? 52,
      rsiShortThresh: s.pineParams?.rsiShortThresh ?? 48,
      tpDist: s.pineParams?.tpDist ?? 14.0,
      slDist: s.pineParams?.slDist ?? 13.75,
      sessionStart: s.pineParams?.sessionStart ?? 1,
      sessionEnd: s.pineParams?.sessionEnd ?? 20,
      excludeHour12: s.pineParams?.excludeHour12 ?? false,
      maxDailyLosses: s.pineParams?.maxDailyLosses ?? 1,
      maxDailyTrades: s.pineParams?.maxDailyTrades ?? 2,
    }));

    return NextResponse.json({
      success: true,
      count: result.length,
      strategies: result,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/internal/vps-strategies error:", error);
    return NextResponse.json({ error: "Failed to load VPS strategies" }, { status: 500 });
  }
}
