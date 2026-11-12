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
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/chart")) return;

    // Check if running in standalone mode
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);
    if (!isStandalone) {
      const onPrompt = () => setCanInstall(true);
      window.addEventListener("beforeinstallprompt", onPrompt);
      return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    }
  }, [pathname]);

  const handleInstallApp = async () => {
    const prompt = (window as any).__stratmarket_pwa_prompt;
    if (prompt) {
      prompt.prompt();
      const res = await prompt.userChoice;
      if (res.outcome === "accepted") {
        setCanInstall(false);
      }
    }
  };

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

  const isDashboardOrProfile = pathname?.startsWith("/dashboard") || pathname?.startsWith("/profile");

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
          style={{ whiteSpace: "nowrap" }}
        >
          <span className="nav-parent-dot" />
          <span className="nav-parent-label" style={{ whiteSpace: "nowrap" }}>by Elvaris Capital</span>
          <span style={{ opacity: 0.7, fontSize: "10px", marginLeft: "1px" }}>↗</span>
        </a>
      </div>

      <span className="chip0">
        <i />
        Live Quant Signals · Active
      </span>

      <div className="r">
        {!isDashboardOrProfile && (
          <>
            <Link href="/blog" className="pill g sm nav-desktop-only">
              Blog
            </Link>
            <Link href="/docs" className="pill g sm nav-docs-link">
              Docs
            </Link>
          </>
        )}
        {!loading && (
          <>
            {user ? (
              <div className="nav-user-group">
                <Link href="/dashboard" className="pill g sm nav-desktop-only">
                  Dashboard
                </Link>
                <Link href="/profile" className="pill g sm">
                  Profile
                </Link>
                {user.role === "ADMIN" && (
                  <>
                    <Link href="/analytics" className="pill g sm nav-desktop-only" style={{ color: "var(--lime)", borderColor: "rgba(163, 230, 53, 0.3)" }}>
                      Analytics
                    </Link>
                    <Link href="/admin" className="pill g sm nav-desktop-only" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
                      Admin
                    </Link>
                  </>
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
        {canInstall && (
          <button
            type="button"
            onClick={handleInstallApp}
            className="pill sm nav-desktop-only"
            style={{
              background: "rgba(163, 230, 53, 0.08)",
              borderColor: "rgba(163, 230, 53, 0.35)",
              color: "var(--lime)",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
            }}
            title="Install StratMarket as Chrome / Desktop App"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Install App</span>
          </button>
        )}
        <Link href="/market" className="pill sm nav-explore-btn">
          <span className="nav-explore-full">Explore strategies</span>
          <span className="nav-explore-compact">Explore</span>
        </Link>
      </div>
    </header>
  );
}
