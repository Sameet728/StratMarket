import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { POST as trackRoute } from "@/app/api/analytics/track/route";
import { GET as overviewRoute } from "@/app/api/analytics/overview/route";
import { POST as authRoute } from "@/app/api/analytics/auth/route";
import { NextRequest } from "next/server";

describe("Telemetry & Analytics Service", () => {
  it("records site visit and updates session heartbeat", async () => {
    const sessionId = "sess_test_123";
    const visit = await db.recordSiteVisit({
      sessionId,
      path: "/market",
      device: "MOBILE",
      browser: "Safari",
      os: "iOS",
      country: "IN",
      durationSeconds: 12,
    });

    expect(visit).toBeDefined();
    expect(visit.sessionId).toBe(sessionId);
    expect(visit.path).toBe("/market");
    expect(visit.device).toBe("MOBILE");

    await db.recordSessionHeartbeat({
      sessionId,
      path: "/market",
      durationSeconds: 45,
    });

    const overview = await db.getAnalyticsOverview();
    expect(overview).toBeDefined();
    expect(overview.summary.totalPageViews).toBeGreaterThan(0);
    expect(overview.summary.totalRegisteredUsers).toBeGreaterThan(0);
    expect(overview.summary.activeUsersNow).toBeGreaterThan(0);
    expect(overview.registeredUsers.length).toBeGreaterThan(0);
  });

  it("strictly enforces password Vedant@06 protection on /api/analytics/overview", async () => {
    // 1. Unauthorized request without admin key
    const unauthReq = new NextRequest("http://localhost:3000/api/analytics/overview");
    const unauthRes = await overviewRoute(unauthReq);
    expect(unauthRes.status).toBe(401);
    const unauthData = await unauthRes.json();
    expect(unauthData.ok).toBe(false);
    expect(unauthData.error).toBe("UNAUTHORIZED_ADMIN_TERMINAL");

    // 2. Auth endpoint rejects wrong password
    const badAuthReq = new NextRequest("http://localhost:3000/api/analytics/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong_password" }),
    });
    const badAuthRes = await authRoute(badAuthReq);
    expect(badAuthRes.status).toBe(401);

    // 3. Auth endpoint accepts password Vedant@06
    const goodAuthReq = new NextRequest("http://localhost:3000/api/analytics/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "Vedant@06" }),
    });
    const goodAuthRes = await authRoute(goodAuthReq);
    expect(goodAuthRes.status).toBe(200);
    const goodAuthData = await goodAuthRes.json();
    expect(goodAuthData.ok).toBe(true);

    // 4. Authorized request with header x-analytics-key: Vedant@06
    const authReq = new NextRequest("http://localhost:3000/api/analytics/overview", {
      headers: {
        "x-analytics-key": "Vedant@06",
      },
    });
    const overviewRes = await overviewRoute(authReq);
    expect(overviewRes.status).toBe(200);
    const overviewData = await overviewRes.json();
    expect(overviewData.summary).toBeDefined();
    expect(overviewData.summary.totalRegisteredUsers).toBeGreaterThanOrEqual(100);
    expect(overviewData.summary.totalSignalsSent).toBeGreaterThanOrEqual(90);
    expect(overviewData.summary.totalDeliveries).toBeGreaterThanOrEqual(2000);
  });
});
