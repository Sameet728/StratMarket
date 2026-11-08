"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { StratMarketLogo } from "@/components/StratMarketLogo";

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
      <div className="nav-left">
        <Link href="/" className="logo">
          <StratMarketLogo size={22} className="mk" color="#ffffff" />
          <span className="logo-text">StratMarket</span>
        </Link>
        <a
          href="https://elvariscapital.in"
          target="_blank"
          rel="noopener noreferrer"
          title="Parent Organization: Elvaris Capital (elvariscapital.in)"
          className="nav-parent-badge"
        >
          <span className="nav-parent-dot" />
          <span className="nav-parent-label">by Elvaris Capital</span>
          <span style={{ opacity: 0.7 }}>↗</span>
        </a>
      </div>

      <span className="chip0">
        <i />
        Live Quant Signals · Active
      </span>

      <div className="r">
        <Link href="/docs" className="pill g sm nav-docs-link">
          Docs
        </Link>
        {!loading && (
          <>
            {user ? (
              <div className="nav-user-group">
                <Link href="/dashboard" className="pill g sm">
                  Dashboard
                </Link>
                <Link href="/profile" className="pill g sm nav-desktop-only">
                  Profile
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="pill g sm nav-desktop-only" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="pill g sm nav-desktop-only"
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
        <Link href="/market" className="pill sm nav-explore-btn">
          <span className="nav-explore-full">Explore strategies</span>
          <span className="nav-explore-compact">Explore</span>
        </Link>
      </div>
    </header>
  );
}
