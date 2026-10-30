import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendSignalAlertEmail } from "@/lib/email/resend";
import { z } from "zod";

const AlertUpdateSchema = z.object({
  strategyId: z.string(),
  enabled: z.boolean(),
  alertTypes: z.array(z.string()).default(["ENTRY", "EXIT"]),
  destinationEmail: z.string().email().optional(),
});

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await db.getUserAlertPreferences(user.id);
    const deliveries = await db.getUserDeliveries(user.id);
    const currentDestination = preferences[0]?.verifiedDestination || user.email;

    return NextResponse.json({
      success: true,
      preferences,
      deliveries,
      destinationEmail: currentDestination,
      userEmail: user.email,
    });
  } catch (error: any) {
    console.error("GET /api/me/alerts error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Batch update destination email across all preferences
    if (body.action === "UPDATE_EMAIL" && body.email) {
      const emailValidation = z.string().email().safeParse(body.email);
      if (!emailValidation.success) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }

      await db.updateAllUserAlertDestinations(user.id, body.email);
      return NextResponse.json({
        success: true,
        message: "Signal notification email updated successfully.",
        destinationEmail: body.email,
      });
    }

    const parsed = AlertUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid alert preference data" },
        { status: 400 }
      );
    }

    const { strategyId, enabled, alertTypes, destinationEmail } = parsed.data;
    const updated = await db.setAlertPreference(user.id, strategyId, enabled, alertTypes, destinationEmail);

    return NextResponse.json({
      success: true,
      message: "Alert preference updated.",
      preference: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/me/alerts error:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const targetEmail = (body.email && typeof body.email === "string") ? body.email.trim() : user.email;

    if (!/^\S+@\S+\.\S+$/.test(targetEmail)) {
      return NextResponse.json({ error: "Invalid recipient email address" }, { status: 400 });
    }

    // Send sample signal email via Resend verified domain
    const emailRes = await sendSignalAlertEmail({
      to: targetEmail,
      strategyName: "Ensemble 01: 6-Engine Peak Champion",
      strategyId: "ensemble-01",
      instrument: "XAUUSD",
      timeframe: "M15",
      signalType: "ENTRY",
      direction: "LONG",
      entryPrice: 2742.50,
      stopLoss: 2736.00,
      targetPrice: 2755.00,
      timestamp: new Date(),
      sourceEventId: "evt_sample_test_" + Date.now(),
    });

    if (!emailRes.success) {
      return NextResponse.json(
        { error: emailRes.error || "Failed to dispatch sample signal email" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sample signal alert email sent successfully to ${targetEmail}! Check your inbox.`,
      messageId: emailRes.messageId,
    });
  } catch (error: any) {
    console.error("POST /api/me/alerts error:", error);
    return NextResponse.json({ error: "Failed to send sample email" }, { status: 500 });
  }
}
