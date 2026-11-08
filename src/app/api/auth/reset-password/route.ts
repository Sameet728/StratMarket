import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth/session";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "stratmarket_session";
const MAX_AGE_SECONDS = parseInt(process.env.SESSION_MAX_AGE_SECONDS || "604800", 10);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email, otp, password } = parsed.data;
    const normalized = email.toLowerCase().trim();

    // Verify OTP and update password
    const newPasswordHash = await hashPassword(password);
    const result = await db.resetPasswordWithOtp(normalized, otp, newPasswordHash);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || "Failed to reset password. Please check your verification code." },
        { status: 400 }
      );
    }

    const user = result.user;

    // Sign session token for automatic sign-in
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
    });

    const response = NextResponse.json({
      success: true,
      message: "Password reset successfully. Signing you into your dashboard...",
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
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}

