"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInContent() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "";
  const safeRedirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "";

  // Auth vs Forgot Mode
  const paramMode = searchParams.get("mode");
  const paramCode = searchParams.get("code") || "";
  const paramEmail = searchParams.get("email") || "";

  const [mode, setMode] = useState<"AUTH" | "FORGOT">(() => {
    return paramMode === "forgot" || Boolean(paramCode) ? "FORGOT" : "AUTH";
  });
  const [forgotStep, setForgotStep] = useState<1 | 2>(() => {
    return paramCode ? 2 : 1;
  });

  // Standard Login/Register State
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(paramEmail);
  const [password, setPassword] = useState("");
  const [e1, setE1] = useState("");
  const [e2, setE2] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [globalOk, setGlobalOk] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password / OTP State
  const [forgotEmail, setForgotEmail] = useState(paramEmail);
  const [otpCode, setOtpCode] = useState(paramCode);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotOk, setForgotOk] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const router = useRouter();

  // Handle Resend Countdown Timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Standard Login / Register submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setE1("");
    setE2("");
    setGlobalError("");
    setGlobalOk("");

    let valid = true;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setE1("Enter a valid email address.");
      valid = false;
    }
    if (isRegister) {
      if (password.length < 8) {
        setE2("Use at least 8 characters.");
        valid = false;
      }
      if (!name.trim()) {
        setGlobalError("Please provide your full name.");
        valid = false;
      }
    } else {
      if (!password) {
        setE2("Password is required.");
        valid = false;
      }
    }

    if (!valid) return;

    setLoading(true);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      setGlobalOk(
        isRegister
          ? "Account registered! Redirecting to your dashboard..."
          : "Signed in! Redirecting..."
      );

      const targetPath = safeRedirect
        ? safeRedirect
        : data.user?.role === "ADMIN"
        ? "/admin"
        : "/dashboard";

      setTimeout(() => {
        router.push(targetPath);
        router.refresh();
      }, 400);
    } catch {
      setGlobalError("Network error. Please try again.");
      setLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError("");
    setForgotOk("");

    const targetEmail = (forgotEmail || email).trim();
    if (!/^\S+@\S+\.\S+$/.test(targetEmail)) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to send verification code.");
        setForgotLoading(false);
        return;
      }

      setForgotOk(`Verification code sent to ${targetEmail}`);
      setForgotStep(2);
      setResendTimer(60); // 60 seconds cooldown
      setForgotLoading(false);
    } catch {
      setForgotError("Network error. Could not request password reset.");
      setForgotLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotOk("");

    const cleanOtp = otpCode.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setForgotError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match. Please re-enter.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: (forgotEmail || email).trim(),
          otp: cleanOtp,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to reset password.");
        setForgotLoading(false);
        return;
      }

      setForgotOk("Password reset successfully! Redirecting to your dashboard...");

      const targetPath = safeRedirect ? safeRedirect : "/dashboard";

      setTimeout(() => {
        router.push(targetPath);
        router.refresh();
      }, 700);
    } catch {
      setForgotError("Network error. Could not reset password.");
      setForgotLoading(false);
    }
  };

  return (
    <div className="page" id="p-signin">
      <section className="b">
        <div className="wrap" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
          {/* Logo mark */}
          <div style={{ marginBottom: 24, marginTop: 40 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.04em",
                color: "var(--tx)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #fff 0%, #999 100%)",
                  display: "inline-block",
                }}
              />
              Elvaris Capital
            </span>
          </div>

          {mode === "FORGOT" ? (
            /* ================= FORGOT PASSWORD / OTP FLOW ================= */
            <div>
              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    background: "rgba(212, 175, 55, 0.12)",
                    border: "1px solid rgba(212, 175, 55, 0.35)",
                    color: "#f5d77f",
                    fontFamily: "'SF Mono', Menlo, monospace",
                  }}
                >
                  {forgotStep === 1 ? "Account Recovery" : "Security Verification"}
                </span>
              </div>

              <h2 style={{ fontSize: 34, marginBottom: 8, letterSpacing: "-0.03em" }}>
                {forgotStep === 1 ? "Reset password" : "Enter verification code"}
              </h2>
              <p className="lede" style={{ margin: "0 auto 28px", fontSize: 14.5, color: "var(--mut)", maxWidth: 380, lineHeight: 1.5 }}>
                {forgotStep === 1
                  ? "Enter your registered email address to receive an institutional 6-digit OTP code."
                  : `Enter the 6-digit OTP code sent to ${forgotEmail || email} and choose your new password.`}
              </p>

              {forgotStep === 1 ? (
                /* Step 1: Request OTP */
                <form className="form" onSubmit={handleRequestOtp} noValidate style={{ textAlign: "left" }}>
                  <label>
                    Registered Email Address
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={forgotEmail || email}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setEmail(e.target.value);
                      }}
                      autoComplete="email"
                      autoFocus
                    />
                  </label>

                  {forgotError && (
                    <div className="err" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 12 }}>
                      {forgotError}
                    </div>
                  )}

                  <button className="pill" type="submit" disabled={forgotLoading} style={{ width: "100%", marginTop: 4 }}>
                    {forgotLoading ? "Dispatching OTP..." : "Send Verification Code →"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("AUTH");
                        setForgotError("");
                        setForgotOk("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--mut)",
                        fontSize: 13.5,
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Verify OTP & New Password */
                <form className="form" onSubmit={handleResetPassword} noValidate style={{ textAlign: "left" }}>
                  <label>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>6-Digit Verification Code (OTP)</span>
                      {resendTimer > 0 ? (
                        <span style={{ fontSize: 12, color: "var(--mut)", fontFamily: "'SF Mono', monospace" }}>
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestOtp()}
                          disabled={forgotLoading}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f5d77f",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          Resend code
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtpCode(val);
                      }}
                      autoComplete="one-time-code"
                      autoFocus
                      style={{
                        fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                        fontSize: 22,
                        letterSpacing: "0.45em",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    />
                  </label>

                  <label>
                    New Password
                    <input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>

                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>

                  {forgotError && (
                    <div className="err" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 12 }}>
                      {forgotError}
                    </div>
                  )}

                  {forgotOk && (
                    <div className="ok" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", marginBottom: 12 }}>
                      {forgotOk}
                    </div>
                  )}

                  <button className="pill" type="submit" disabled={forgotLoading} style={{ width: "100%", marginTop: 4 }}>
                    {forgotLoading ? "Resetting Password..." : "Reset Password & Sign In →"}
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotError("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--mut)",
                        fontSize: 13,
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      ← Use different email
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("AUTH");
                        setForgotError("");
                        setForgotOk("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--mut)",
                        fontSize: 13,
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ================= STANDARD SIGN IN / REGISTER FLOW ================= */
            <div>
              <h2 style={{ fontSize: 38, marginBottom: 8 }}>
                {isRegister ? "Create account" : "Welcome back"}
              </h2>
              <p className="lede" style={{ margin: "0 auto 28px", fontSize: 15, color: "var(--mut)", maxWidth: 360 }}>
                {isRegister
                  ? "Register for free access to all live charts and signals."
                  : "Sign in to access your live strategy signals and dashboard."}
              </p>

              <form className="form" onSubmit={handleSubmit} noValidate style={{ textAlign: "left" }}>
                {isRegister && (
                  <label>
                    Full Name
                    <input
                      type="text"
                      placeholder="e.g. Alex Vance"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                )}

                <label>
                  Email
                  <input
                    id="em"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <span className="err" id="e1">
                    {e1}
                  </span>
                </label>

                <label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Password</span>
                    {!isRegister && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("FORGOT");
                          setForgotEmail(email);
                          setForgotStep(1);
                          setGlobalError("");
                          setGlobalOk("");
                          setForgotError("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--mut)",
                          fontSize: 12.5,
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="pw"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                  />
                  <span className="err" id="e2">
                    {e2}
                  </span>
                </label>

                {globalError && (
                  <div className="err" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {globalError}
                  </div>
                )}
                {globalOk && (
                  <div className="ok" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }}>
                    {globalOk}
                  </div>
                )}

                <button className="pill" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
                  {loading
                    ? "Processing..."
                    : isRegister
                    ? "Create Account"
                    : "Sign In →"}
                </button>

                <div style={{ textAlign: "center", marginTop: 14, fontSize: 14, color: "var(--mut)" }}>
                  {isRegister ? (
                    <span>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegister(false);
                          setGlobalError("");
                        }}
                        style={{ background: "none", border: "none", color: "var(--tx)", textDecoration: "underline", cursor: "pointer" }}
                      >
                        Sign in
                      </button>
                    </span>
                  ) : (
                    <span>
                      No account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegister(true);
                          setGlobalError("");
                        }}
                        style={{ background: "none", border: "none", color: "var(--tx)", textDecoration: "underline", cursor: "pointer" }}
                      >
                        Create one free
                      </button>
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--mut)" }}>
            By signing in you agree to Elvaris Capital{" "}
            <Link href="/how" style={{ color: "var(--mut)", textDecoration: "underline" }}>Terms of Service</Link>.
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="page" style={{ minHeight: "100vh" }} />}>
      <SignInContent />
    </Suspense>
  );
}
