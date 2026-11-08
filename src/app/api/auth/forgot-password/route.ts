import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetOtpEmail } from "@/lib/email/resend";
import { z } from "zod";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalized = email.toLowerCase().trim();

    // Check user existence
    const user = await db.getUserByEmail(normalized);
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. Please register or check your spelling." },
        { status: 404 }
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account has been suspended. Please contact Elvaris Capital support." },
        { status: 403 }
      );
    }

    // Generate secure 6-digit OTP & record in DB
    const { otp } = await db.createPasswordResetOtp(normalized);

    // Send institutional OTP email asynchronously
    sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiresInMinutes: 10,
    }).catch((err) => {
      console.error("[Email] Failed to send password reset OTP email:", err);
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox.`,
      email: user.email,
    });
  } catch (error: any) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request. Please try again." },
      { status: 500 }
    );
  }
}

