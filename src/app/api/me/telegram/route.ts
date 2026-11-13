import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTelegramBotUsername } from "@/lib/notifications/telegram";
import { z } from "zod";

const TelegramSaveSchema = z.object({
  chatId: z.string().trim(),
  enabled: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db.getUserTelegramSettings(user.id, user.email);

    return NextResponse.json({
      chatId: settings.chatId || "",
      enabled: settings.enabled,
      botUsername: getTelegramBotUsername(),
    });
  } catch (error: any) {
    console.error("[GET /api/me/telegram] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve Telegram alert settings" },
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
    const parsed = TelegramSaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { chatId, enabled } = parsed.data;

    if (enabled && !chatId) {
      return NextResponse.json(
        { error: "Telegram Chat ID cannot be empty when alerts are enabled." },
        { status: 400 }
      );
    }

    const saved = await db.saveUserTelegramSettings(user.id, {
      userEmail: user.email,
      chatId,
      enabled,
    });

    return NextResponse.json({
      success: true,
      message: "Telegram notification settings saved successfully.",
      chatId: saved.chatId,
      enabled: saved.enabled,
      botUsername: getTelegramBotUsername(),
    });
  } catch (error: any) {
    console.error("[POST /api/me/telegram] Error:", error);
    return NextResponse.json(
      { error: "Failed to save Telegram alert settings", details: error.message },
      { status: 500 }
    );
  }
}

