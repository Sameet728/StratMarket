import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * DELETE /api/me/alerts/reset-test
 * Resets the test email quota for the authenticated user (admin/owner only).
 * Called after a Resend API key rotation to allow re-verification.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.resetUserTestEmailQuota(user.id, user.email);

    return NextResponse.json({
      success: true,
      message: "Test email quota reset. You can now send 1 new verification test email.",
    });
  } catch (error: any) {
    console.error("DELETE /api/me/alerts/reset-test error:", error);
    return NextResponse.json({ error: "Failed to reset quota" }, { status: 500 });
  }
}

