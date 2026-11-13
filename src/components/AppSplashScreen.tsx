"use client";

import { useEffect, useState } from "react";
import { StratMarketLogo } from "@/components/StratMarketLogo";

export function AppSplashScreen() {
  const [show, setShow] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // 1. Check if running as installed standalone app (Phone PWA or Desktop App)
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    // Only activate for installed standalone app
    if (!isStandalone) return;

    // 2. Only show on app cold launch (once per session)
    try {
      const alreadyPlayed = sessionStorage.getItem("stratmarket_app_splash_played");
      if (alreadyPlayed) return;
      sessionStorage.setItem("stratmarket_app_splash_played", "true");
    } catch (_) {
      // fallback if sessionStorage unavailable
    }

    setShow(true);

    // Sequence:
    // 0ms - 1300ms: Logo, brand, and "by Elvaris Capital" animate in
    // 1400ms: Start smooth cross-fade out
    // 1800ms: Completely unmount from DOM
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 1450);

    const removeTimer = setTimeout(() => {
      setShow(false);
    }, 1850);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleDismiss = () => {
    setFadingOut(true);
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  return (
    <div
      onClick={handleDismiss}
      aria-label="StratMarket App Launch Screen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? "scale(1.03)" : "scale(1)",
        transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: fadingOut ? "none" : "auto",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Ambient Radial Lime Glow */}
      <div
        style={{
          position: "absolute",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(163, 230, 53, 0.14) 0%, rgba(0, 0, 0, 0) 70%)",
          filter: "blur(32px)",
          pointerEvents: "none",
          animation: "splashGlow 1.6s ease-in-out infinite alternate",
        }}
      />

      {/* Main Logo Container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: "splashLogoScale 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            background: "linear-gradient(145deg, #18181b 0%, #09090b 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "18px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(163, 230, 53, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "18px",
          }}
        >
          <StratMarketLogo size={42} color="#ffffff" />
        </div>

        {/* Brand Name */}
        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            letterSpacing: "4px",
            color: "#ffffff",
            textTransform: "uppercase",
            fontFamily: "var(--font-sans), -apple-system, BlinkMacSystemFont, sans-serif",
            animation: "splashTextReveal 0.6s 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          StratMarket
        </div>

        {/* by Elvaris Capital badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "10px",
            padding: "4px 12px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            animation: "splashByElvaris 0.6s 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#a3e635",
              boxShadow: "0 0 8px #a3e635",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "1.2px",
              color: "#a1a1aa",
              textTransform: "uppercase",
            }}
          >
            by Elvaris Capital
          </span>
        </div>
      </div>

      {/* Subtle Bottom Loading Line */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          width: "120px",
          height: "2px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, #a3e635, transparent)",
            animation: "splashLine 1.4s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes splashLogoScale {
          from {
            opacity: 0;
            transform: scale(0.82) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes splashTextReveal {
          from {
            opacity: 0;
            transform: translateY(6px);
            letter-spacing: 2px;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 4px;
          }
        }
        @keyframes splashByElvaris {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes splashGlow {
          from {
            opacity: 0.5;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1.15);
          }
        }
        @keyframes splashLine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
