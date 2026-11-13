import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMt5PythonBridgeScript } from "@/lib/trading/mt5-relay";
import { z } from "zod";

const WebhookSaveSchema = z.object({
  webhookUrl: z.string().trim(),
  secretToken: z.string().optional().nullable(),
  enabled: z.boolean(),
  strategySettings: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      magicNumber: z.number().optional(),
      customLotSize: z.number().optional(),
    })
  ).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhook = await db.getUserTradingWebhook(user.id);
    const pythonScript = getMt5PythonBridgeScript(webhook?.secretToken || "");

    return NextResponse.json({
      webhook: webhook || {
        id: "",
        userId: user.id,
        userEmail: user.email,
        webhookUrl: "",
        secretToken: "",
        enabled: false,
        strategySettings: {
          "PS-01": { enabled: true, magicNumber: 10101, customLotSize: 0.01 },
          "PS-02": { enabled: false, magicNumber: 10102, customLotSize: 0.01 },
          "PS-03": { enabled: false, magicNumber: 10103, customLotSize: 0.01 },
        },
        recentRelays: [],
      },
      pythonScript,
    });
  } catch (error: any) {
    console.error("[GET /api/me/trading-webhook] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve MT5 trading webhook configuration" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = WebhookSaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { webhookUrl, secretToken, enabled, strategySettings } = parsed.data;

    // Validate URL if enabled
    if (enabled && webhookUrl) {
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
          { error: "Invalid Webhook URL format. E.g. http://123.45.67.89:5000/trade" },
          { status: 400 }
        );
      }
    } else if (enabled && !webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL cannot be empty when trading relay is enabled" },
        { status: 400 }
      );
    }

    const saved = await db.saveUserTradingWebhook(user.id, {
      userEmail: user.email,
      webhookUrl: webhookUrl || "",
      secretToken: secretToken || undefined,
      enabled,
      strategySettings: strategySettings || {
        "PS-01": { enabled: true, magicNumber: 10101, customLotSize: 0.01 },
        "PS-02": { enabled: false, magicNumber: 10102, customLotSize: 0.01 },
        "PS-03": { enabled: false, magicNumber: 10103, customLotSize: 0.01 },
      },
    });

    const pythonScript = getMt5PythonBridgeScript(saved.secretToken || "");

    return NextResponse.json({
      success: true,
      message: "MT5 VPS Webhook configuration saved successfully",
      webhook: saved,
      pythonScript,
    });
  } catch (error: any) {
    console.error("[POST /api/me/trading-webhook] Error:", error);
    return NextResponse.json(
      { error: "Failed to save MT5 trading webhook configuration", details: error.message },
      { status: 500 }
    );
  }
}
