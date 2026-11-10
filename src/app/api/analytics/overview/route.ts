import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const ADMIN_ANALYTICS_PASSWORD = process.env.ANALYTICS_ADMIN_PASSWORD || "Vedant@06";

export async function GET(req: NextRequest) {
  try {
    // 1. Check authorization via header, cookie, or ADMIN session
    const headerKey = req.headers.get("x-analytics-key");
    const cookieKey = req.cookies.get("sm_analytics_auth")?.value;
    const session = await getSession();

    const isAuthorized =
      headerKey === ADMIN_ANALYTICS_PASSWORD ||
      cookieKey === ADMIN_ANALYTICS_PASSWORD ||
      session?.role === "ADMIN";

    if (!isAuthorized) {
      return NextResponse.json(
        {
          ok: false,
          error: "UNAUTHORIZED_ADMIN_TERMINAL",
          message: "Restricted administrative terminal. Valid authorization key required.",
        },
        { status: 401 }
      );
    }

    const data = await db.getAnalyticsOverview();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("[Analytics Overview API] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load analytics overview" },
      { status: 500 }
    );
  }
}
