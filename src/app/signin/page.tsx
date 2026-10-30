"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [e1, setE1] = useState("");
  const [e2, setE2] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [globalOk, setGlobalOk] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    if (password.length < 8) {
      setE2("Use at least 8 characters.");
      valid = false;
    }
    if (isRegister && !name.trim()) {
      setGlobalError("Please provide your full name.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister ? { name, email, password } : { email, password };

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

      setTimeout(() => {
        if (data.user?.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }, 700);
    } catch {
      setGlobalError("Network error. Please try again.");
      setLoading(false);
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

          <h2 style={{ fontSize: 38, marginBottom: 8 }}>
            {isRegister ? "Create account" : "Welcome back"}
          </h2>
          <p className="lede" style={{ margin: "0 auto 28px", fontSize: 15, color: "var(--mut)", maxWidth: 360 }}>
            {isRegister
              ? "Register for a free 7-day trial on any strategy."
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
              Password
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

            {globalError && <div className="err" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{globalError}</div>}
            {globalOk && <div className="ok" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>{globalOk}</div>}

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

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--mut)" }}>
            By signing in you agree to Elvaris Capital{" "}
            <Link href="/how" style={{ color: "var(--mut)", textDecoration: "underline" }}>Terms of Service</Link>.
          </div>
        </div>
      </section>
    </div>
  );
}
