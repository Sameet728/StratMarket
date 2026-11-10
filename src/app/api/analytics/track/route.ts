import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "PAGE_VIEW";
    const sessionId = (body.sessionId || "sm_anon_" + Math.random().toString(36).substring(2, 10)).trim();
    const path = (body.path || "/").trim();
    const durationSeconds = Number(body.durationSeconds) || 1;

    // Geographic and client headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || body.country || "IN";
    const city = req.headers.get("x-vercel-ip-city") || body.city || null;
    const userAgent = req.headers.get("user-agent") || "";

    // Device parsing fallback if not supplied
    let detectedDevice = body.device;
    if (!detectedDevice) {
      const ua = userAgent.toLowerCase();
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        detectedDevice = "TABLET";
      } else if (/mobile|iphone|android|touch/i.test(ua)) {
        detectedDevice = "MOBILE";
      } else if (/bot|crawler|spider|crawling/i.test(ua)) {
        detectedDevice = "BOT";
      } else {
        detectedDevice = "DESKTOP";
      }
    }

    // Browser parsing fallback
    let detectedBrowser = body.browser;
    if (!detectedBrowser) {
      const ua = userAgent.toLowerCase();
      if (ua.includes("chrome") && !ua.includes("edg")) detectedBrowser = "Chrome";
      else if (ua.includes("safari") && !ua.includes("chrome")) detectedBrowser = "Safari";
      else if (ua.includes("edg")) detectedBrowser = "Edge";
      else if (ua.includes("firefox")) detectedBrowser = "Firefox";
      else detectedBrowser = "Browser";
    }

    // Operating system parsing fallback
    let detectedOs = body.os;
    if (!detectedOs) {
      const ua = userAgent.toLowerCase();
      if (ua.includes("win")) detectedOs = "Windows";
      else if (ua.includes("mac")) detectedOs = "macOS";
      else if (ua.includes("iphone") || ua.includes("ipad")) detectedOs = "iOS";
      else if (ua.includes("android")) detectedOs = "Android";
      else if (ua.includes("linux")) detectedOs = "Linux";
      else detectedOs = "OS";
    }

    if (action === "HEARTBEAT") {
      await db.recordSessionHeartbeat({
        sessionId,
        path,
        durationSeconds,
        userId: body.userId || null,
        userEmail: body.userEmail || null,
      });
      return NextResponse.json({ ok: true, type: "HEARTBEAT" });
    }

    const record = await db.recordSiteVisit({
      sessionId,
      path,
      userId: body.userId || null,
      userEmail: body.userEmail || null,
      referrer: body.referrer || null,
      ip,
      country,
      city,
      device: detectedDevice,
      browser: detectedBrowser,
      os: detectedOs,
      screenResolution: body.screenResolution || null,
      durationSeconds,
    });

    return NextResponse.json({ ok: true, type: "PAGE_VIEW", id: record.id });
  } catch (error: any) {
    console.error("[Analytics Track API] Error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Failed to record telemetry" }, { status: 500 });
  }
}

