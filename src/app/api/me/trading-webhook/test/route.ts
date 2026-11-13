import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { testUserMt5Webhook } from "@/lib/trading/mt5-relay";
import { z } from "zod";

const WebhookTestSchema = z.object({
  webhookUrl: z.string().trim().min(1, "Webhook URL is required"),
  secretToken: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = WebhookTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { webhookUrl, secretToken } = parsed.data;

    try {
      const urlObj = new URL(webhookUrl);
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        return NextResponse.json(
          { error: "Webhook URL must start with http:// or https://" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid Webhook URL format" },
        { status: 400 }
      );
    }

    const result = await testUserMt5Webhook(webhookUrl, secretToken || undefined);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      responseBody: result.responseBody,
      error: result.error,
    });
  } catch (error: any) {
    console.error("[POST /api/me/trading-webhook/test] Error:", error);
    return NextResponse.json(
      { error: "Handshake test encountered an internal error", details: error.message },
      { status: 500 }
    );
  }
}
