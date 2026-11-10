import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const data = await db.getAnalyticsOverview();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Analytics Overview API] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load analytics overview" },
      { status: 500 }
    );
  }
}
