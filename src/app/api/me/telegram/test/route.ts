import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sendTestTelegramAlert, getTelegramBotUsername } from "@/lib/notifications/telegram";
import { z } from "zod";

const TestSchema = z.object({
  chatId: z.string().trim().min(1, "Telegram Chat ID is required."),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = TestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid Telegram Chat ID." },
        { status: 400 }
      );
    }

    const { chatId } = parsed.data;
    const result = await sendTestTelegramAlert(chatId, user.email);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test notification sent to your Telegram chat successfully!",
        botUsername: getTelegramBotUsername(),
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || "Failed to send message via Telegram Bot.",
      botUsername: getTelegramBotUsername(),
    }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/me/telegram/test] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error testing Telegram alert." },
      { status: 500 }
    );
  }
}

