import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendSignalAlertEmail } from "@/lib/email/resend";
import { z } from "zod";

const AlertUpdateSchema = z.object({
  strategyId: z.string(),
  enabled: z.boolean(),
  alertTypes: z.array(z.string()).optional().default(["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"]),
  destinationEmail: z.string().optional().nullable(),
});

interface CookieAlertPayload {
  userId: string;
  destinationEmail?: string;
  alerts: Record<string, boolean>;
  updatedAt?: number;
}

function parseAlertPrefsCookie(raw?: string): CookieAlertPayload | null {
  if (!raw) return null;
  try {
    const jsonStr = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

function serializeAlertPrefsCookie(data: CookieAlertPayload): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookiePrefs = parseAlertPrefsCookie(request.cookies.get("stratmarket_alert_prefs")?.value);

    const [preferences, deliveries, trials, entitlements, strategies] = await Promise.all([
      db.getUserAlertPreferences(user.id, user.email),
      db.getUserDeliveries(user.id),
      db.getUserTrials(user.id),
      db.getUserEntitlements(user.id),
      db.getStrategies({ includeDrafts: false }),
    ]);

    const currentDestination =
      preferences.find((p) => p.verifiedDestination)?.verifiedDestination ||
      (cookiePrefs?.destinationEmail && cookiePrefs.destinationEmail.includes("@") ? cookiePrefs.destinationEmail : null) ||
      user.email;

    const now = new Date();

    const strategyAlerts = await Promise.all(
      strategies.map(async (s) => {
        const userPref = preferences.find(
          (p) =>
            p.strategyId.toUpperCase() === s.id.toUpperCase() ||
            p.strategyId.toLowerCase() === s.slug.toLowerCase()
        );
        const allPref = preferences.find((p) => p.strategyId === "ALL");
        
        // Determine enabled status: DB priority, with durable cookie backup
        let enabled = false;
        if (userPref !== undefined) {
          enabled = Boolean(userPref.enabled);
        } else if (allPref !== undefined) {
          enabled = Boolean(allPref.enabled);
        } else if (cookiePrefs && cookiePrefs.alerts) {
          if (cookiePrefs.alerts[s.id] !== undefined) {
            enabled = Boolean(cookiePrefs.alerts[s.id]);
          } else if (cookiePrefs.alerts[s.slug] !== undefined) {
            enabled = Boolean(cookiePrefs.alerts[s.slug]);
          } else if (cookiePrefs.alerts[s.id.toUpperCase()] !== undefined) {
            enabled = Boolean(cookiePrefs.alerts[s.id.toUpperCase()]);
          } else if (cookiePrefs.alerts[s.slug.toLowerCase()] !== undefined) {
            enabled = Boolean(cookiePrefs.alerts[s.slug.toLowerCase()]);
          } else if (cookiePrefs.alerts["ALL"] !== undefined) {
            enabled = Boolean(cookiePrefs.alerts["ALL"]);
          }
        }

        let userTrial = trials.find(
          (t) =>
            t.strategyId.toUpperCase() === s.id.toUpperCase() ||
            t.strategyId.toLowerCase() === s.slug.toLowerCase()
        );

        const hasPaid = entitlements.some(
          (e) =>
            e.status === "ACTIVE" &&
            new Date(e.expiryTime) > now &&
            e.entitlementType === "PAID" &&
            (e.strategyId === s.id || e.strategyId === null)
        );

        // Auto-provision trial if user previously activated alerts but trial record was absent
        if (enabled && !userTrial && !hasPaid) {
          try {
            const autoTrial = await db.startTrial(user.id, s.slug);
            userTrial = autoTrial.trial;
          } catch (_) {}
        }

        const isTrialActive =
          Boolean(userTrial && userTrial.status === "ACTIVE" && new Date(userTrial.expiryTime) > now);
        const isTrialExpired =
          Boolean(userTrial && (userTrial.status === "EXPIRED" || new Date(userTrial.expiryTime) <= now));
        const daysLeft =
          userTrial && isTrialActive
            ? Math.max(0, Math.ceil((new Date(userTrial.expiryTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;

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
          trialStatus: (isTrialActive ? "ACTIVE" : isTrialExpired ? "EXPIRED" : "NOT_STARTED") as "ACTIVE" | "EXPIRED" | "NOT_STARTED",
          daysLeft,
          expiryTime: userTrial?.expiryTime ? new Date(userTrial.expiryTime).toISOString() : undefined,
          chartUrl: `/chart/${s.slug}`,
          reportUrl: `/strategies/${s.slug}`,
        };
      })
    );

    const response = NextResponse.json({
      success: true,
      preferences,
      strategies: strategyAlerts,
      deliveries,
      destinationEmail: currentDestination,
      userEmail: user.email,
    });

    // Refresh and sync the alert prefs cookie so it is always warm
    const activeMap: Record<string, boolean> = { ...(cookiePrefs?.alerts || {}) };
    strategyAlerts.forEach((sa) => {
      activeMap[sa.id] = sa.enabled;
      activeMap[sa.slug] = sa.enabled;
    });

    response.cookies.set("stratmarket_alert_prefs", serializeAlertPrefsCookie({
      userId: user.id,
      destinationEmail: currentDestination,
      alerts: activeMap,
      updatedAt: Date.now(),
    }), {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
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
    const existingCookie = parseAlertPrefsCookie(request.cookies.get("stratmarket_alert_prefs")?.value);

    // Batch update destination email across all preferences
    if (body.action === "UPDATE_EMAIL" && body.email) {
      const emailValidation = z.string().email().safeParse(body.email);
      if (!emailValidation.success) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }

      await db.updateAllUserAlertDestinations(user.id, body.email);

      const cookiePayload: CookieAlertPayload = {
        userId: user.id,
        destinationEmail: body.email.trim(),
        alerts: existingCookie?.alerts || {},
        updatedAt: Date.now(),
      };

      const response = NextResponse.json({
        success: true,
        message: "Signal notification email updated successfully.",
        destinationEmail: body.email,
      });

      response.cookies.set("stratmarket_alert_prefs", serializeAlertPrefsCookie(cookiePayload), {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    }

    const parsed = AlertUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid alert preference data" },
        { status: 400 }
      );
    }

    const { strategyId, enabled, alertTypes, destinationEmail } = parsed.data;

    // If enabling alerts on a strategy: enforce active trial or Pro membership
    if (enabled && strategyId !== "ALL" && user.role !== "ADMIN") {
      try {
        const [trials, entitlements] = await Promise.all([
          db.getUserTrials(user.id),
          db.getUserEntitlements(user.id),
        ]);
        const now = new Date();
        const hasPaid = entitlements.some(
          (e) =>
            e.status === "ACTIVE" &&
            new Date(e.expiryTime) > now &&
            e.entitlementType === "PAID" &&
            (e.strategyId === strategyId || e.strategyId === null)
        );
        const strategyTrial = trials.find(
          (t) =>
            t.strategyId.toUpperCase() === strategyId.toUpperCase() ||
            t.strategyId.toLowerCase() === strategyId.toLowerCase()
        );
        const isTrialExpired = Boolean(
          strategyTrial && (strategyTrial.status === "EXPIRED" || new Date(strategyTrial.expiryTime) <= now)
        );

        if (isTrialExpired && !hasPaid) {
          return NextResponse.json(
            {
              error: "Your 7-day free trial for this strategy has ended. Upgrade to StratMarket Pro to enable real-time email alerts.",
              code: "TRIAL_EXPIRED",
            },
            { status: 403 }
          );
        }

        if (!strategyTrial) {
          await db.startTrial(user.id, strategyId.toLowerCase());
        }
      } catch (err: any) {
        if (err?.message === "TRIAL_ALREADY_USED") {
          return NextResponse.json(
            {
              error: "Your 7-day trial for this strategy has already been used. Upgrade to StratMarket Pro to continue.",
              code: "TRIAL_EXPIRED",
            },
            { status: 403 }
          );
        }
      }
    }

    const cleanEmail =
      destinationEmail && destinationEmail.includes("@")
        ? destinationEmail.trim()
        : user.email;

    const updated = await db.setAlertPreference(user.id, strategyId, enabled, alertTypes, cleanEmail);

    // Update cookie state with both strategyId and slug variations
    const updatedAlerts: Record<string, boolean> = {
      ...(existingCookie?.alerts || {}),
      [strategyId]: enabled,
      [strategyId.toUpperCase()]: enabled,
      [strategyId.toLowerCase()]: enabled,
    };

    const cookiePayload: CookieAlertPayload = {
      userId: user.id,
      destinationEmail: cleanEmail,
      alerts: updatedAlerts,
      updatedAt: Date.now(),
    };

    const response = NextResponse.json({
      success: true,
      message: "Alert preference updated.",
      preference: updated,
    });

    response.cookies.set("stratmarket_alert_prefs", serializeAlertPrefsCookie(cookiePayload), {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
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

    // Send sample signal email via verified institutional gateway
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
