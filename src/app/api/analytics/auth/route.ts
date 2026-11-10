import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const ADMIN_ANALYTICS_PASSWORD = process.env.ANALYTICS_ADMIN_PASSWORD || "Vedant@06";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = (body.password || "").trim();

    // Check password or active admin session
    const session = await getSession();
    const isAdminUser = session?.role === "ADMIN";

    if (password === ADMIN_ANALYTICS_PASSWORD || isAdminUser) {
      const res = NextResponse.json({ ok: true, authenticated: true });
      res.cookies.set("sm_analytics_auth", ADMIN_ANALYTICS_PASSWORD, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return res;
    }

    return NextResponse.json(
      { ok: false, error: "Invalid administrator access key. Access restricted." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Authentication error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const headerKey = req.headers.get("x-analytics-key");
  const cookieKey = req.cookies.get("sm_analytics_auth")?.value;
  const session = await getSession();

  const isAuthed =
    headerKey === ADMIN_ANALYTICS_PASSWORD ||
    cookieKey === ADMIN_ANALYTICS_PASSWORD ||
    session?.role === "ADMIN";

  return NextResponse.json({ authenticated: isAuthed });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.set("sm_analytics_auth", "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
  return res;
}
