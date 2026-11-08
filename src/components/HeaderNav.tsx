"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname?.startsWith("/chart")) return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Check user session
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  if (pathname?.startsWith("/chart")) {
    return null;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  };

  return (
    <header id="nav" className={scrolled ? "s" : ""}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Link href="/" className="logo">
          <svg
            className="mk"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="#444" />
            <path d="M5 16 L10 10 L14 14 L19 7" pathLength="1" />
          </svg>
          StratMarket
        </Link>
        <a
          href="https://elvariscapital.in"
          target="_blank"
          rel="noopener noreferrer"
          title="Parent Organization: Elvaris Capital (elvariscapital.in)"
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            color: "#e4e4e7",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "3px 9px",
            borderRadius: "999px",
            letterSpacing: "0.02em",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>by Elvaris Capital</span>
          <span style={{ opacity: 0.7 }}>↗</span>
        </a>
      </div>

      <span className="chip0">
        <i />
        Live Quant Signals · Active
      </span>

      <div className="r">
        <Link href="/docs" className="pill g sm">
          Docs
        </Link>
        {!loading && (
          <>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link href="/dashboard" className="pill g sm">
                  Dashboard
                </Link>
                <Link href="/profile" className="pill g sm">
                  Profile
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="pill g sm" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="pill g sm"
                  style={{ color: "var(--mut)", border: "none", padding: "7px 10px", touchAction: "manipulation" }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/signin" className="pill g sm">
                Sign in
              </Link>
            )}
          </>
        )}
        <Link href="/market" className="pill sm">
          Explore strategies
        </Link>
      </div>
    </header>
  );
}
