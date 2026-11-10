import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { POST as trackRoute } from "@/app/api/analytics/track/route";
import { GET as overviewRoute } from "@/app/api/analytics/overview/route";
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
    expect(overview.traffic.topPages.length).toBeGreaterThan(0);
    expect(overview.minuteActivityFeed.length).toBeGreaterThan(0);
    expect(overview.registeredUsers.length).toBeGreaterThan(0);
  });

  it("handles /api/analytics/track and /api/analytics/overview routes", async () => {
    const trackReq = new NextRequest("http://localhost:3000/api/analytics/track", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "106.195.1.209",
        "x-vercel-ip-country": "IN",
        "x-vercel-ip-city": "Mumbai",
      },
      body: JSON.stringify({
        action: "PAGE_VIEW",
        sessionId: "sess_route_test",
        path: "/analytics",
        device: "DESKTOP",
      }),
    });

    const trackRes = await trackRoute(trackReq);
    expect(trackRes.status).toBe(200);
    const trackData = await trackRes.json();
    expect(trackData.ok).toBe(true);

    const overviewRes = await overviewRoute();
    expect(overviewRes.status).toBe(200);
    const overviewData = await overviewRes.json();
    expect(overviewData.summary).toBeDefined();
    expect(overviewData.summary.totalRegisteredUsers).toBeGreaterThanOrEqual(100);
    expect(overviewData.summary.totalSignalsSent).toBeGreaterThanOrEqual(90);
    expect(overviewData.summary.totalDeliveries).toBeGreaterThanOrEqual(2000);
    expect(overviewData.minuteActivityFeed.length).toBeGreaterThan(0);
  });
});
