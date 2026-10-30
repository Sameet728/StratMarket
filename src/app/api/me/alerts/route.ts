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

    const [preferences, deliveries, trials, entitlements, strategies] = await Promise.all([
      db.getUserAlertPreferences(user.id),
      db.getUserDeliveries(user.id),
      db.getUserTrials(user.id),
      db.getUserEntitlements(user.id),
      db.getStrategies({ includeDrafts: false }),
    ]);

    const currentDestination =
      preferences.find((p) => p.verifiedDestination)?.verifiedDestination || user.email;

    const now = new Date();

    const strategyAlerts = strategies.map((s) => {
      const userPref = preferences.find(
        (p) =>
          p.strategyId.toUpperCase() === s.id.toUpperCase() ||
          p.strategyId.toLowerCase() === s.slug.toLowerCase()
      );
      const allPref = preferences.find((p) => p.strategyId === "ALL");
      const enabled = userPref ? userPref.enabled : (allPref ? allPref.enabled : false);

      const userTrial = trials.find(
        (t) =>
          t.strategyId.toUpperCase() === s.id.toUpperCase() ||
          t.strategyId.toLowerCase() === s.slug.toLowerCase()
      );
      const isTrialActive =
        Boolean(userTrial && userTrial.status === "ACTIVE" && new Date(userTrial.expiryTime) > now);
      const isTrialExpired =
        Boolean(userTrial && (userTrial.status === "EXPIRED" || new Date(userTrial.expiryTime) <= now));
      const daysLeft =
        userTrial && isTrialActive
          ? Math.max(0, Math.ceil((new Date(userTrial.expiryTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

      const hasPaid = entitlements.some(
        (e) =>
          e.status === "ACTIVE" &&
          new Date(e.expiryTime) > now &&
          e.entitlementType === "PAID" &&
          (e.strategyId === s.id || e.strategyId === null)
      );

      const hasAccess = hasPaid || isTrialActive;

      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        type: s.implementationType, // "PINE_SCRIPT" | "PYTHON"
        instrument: s.instrument,
        timeframe: s.timeframe,
        winRate: s.metrics.winRate,
        profitFactor: s.metrics.profitFactor,
        netReturn: s.metrics.netReturn,
        maxDrawdown: s.metrics.maxDrawdown,
        enabled,
        hasAccess,
        hasPaid,
        trialStatus: isTrialActive ? "ACTIVE" : isTrialExpired ? "EXPIRED" : "NOT_STARTED",
        daysLeft,
        expiryTime: userTrial?.expiryTime,
        chartUrl: `/chart/${s.slug}`,
        reportUrl: `/strategies/${s.slug}`,
      };
    });

    return NextResponse.json({
      success: true,
      preferences,
      strategies: strategyAlerts,
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

    // If enabling alerts on a strategy and user has no trial record yet, automatically start 7-day trial
    if (enabled && strategyId !== "ALL") {
      try {
        const trials = await db.getUserTrials(user.id);
        const hasExisting = trials.some(
          (t) =>
            t.strategyId.toUpperCase() === strategyId.toUpperCase() ||
            t.strategyId.toLowerCase() === strategyId.toLowerCase()
        );
        if (!hasExisting) {
          await db.startTrial(user.id, strategyId.toLowerCase());
        }
      } catch (_) {}
    }

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
      entryPrice: 3895.50,
      stopLoss: 3881.50,
      targetPrice: 3913.50,
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
