"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default true until checked

  useEffect(() => {
    // 1. Register Service Worker for PWA compliance and offline shell caching
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker active with scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration note:", err);
          });
      });
    }

    // 2. Check if already running in standalone mode (desktop Chrome app, Android PWA, iOS PWA)
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(standaloneMode);

    if (standaloneMode) {
      document.documentElement.classList.add("pwa-standalone");
      return; // Already installed, do not show install prompt
    }

    // Check dismissal status in localStorage (hide for 3 days if dismissed)
    try {
      const dismissedAt = localStorage.getItem("stratmarket_pwa_dismissed");
      if (dismissedAt) {
        const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (diffDays < 3) {
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      } else {
        setDismissed(false);
      }
    } catch (_) {
      setDismissed(false);
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Capture Chrome / Edge / Brave / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);

      // Expose globally so HeaderNav or Dashboard buttons can trigger it
      (window as any).__stratmarket_pwa_prompt = e;
    };

    const handleAppInstalled = () => {
      console.log("[PWA] StratMarket installed as standalone desktop/mobile app.");
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      document.documentElement.classList.add("pwa-standalone");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("stratmarket_pwa_dismissed", Date.now().toString());
    } catch (_) {}
  };

  // Do not render anything if already installed as app or dismissed
  if (isStandalone || dismissed || (!canInstall && !isIos)) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom-Right Institutional Install Pill */}
      <aside
        aria-label="Install App"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#09090b",
          border: "1px solid rgba(163, 230, 53, 0.3)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(163, 230, 53, 0.15)",
          padding: "10px 14px",
          borderRadius: "12px",
          backdropFilter: "blur(12px)",
          maxWidth: "340px",
          animation: "pwaSlideIn 0.3s ease-out",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img
            src="/icon-192.png"
            alt="StratMarket Logo"
            width={24}
            height={24}
            style={{ borderRadius: "4px" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Install StratMarket App
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#a1a1aa",
              lineHeight: "13px",
              marginTop: "2px",
            }}
          >
            Standalone window · Instant access · Zero latency
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              background: "#a3e635",
              color: "#000000",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Install
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            style={{
              background: "transparent",
              border: "none",
              color: "#71717a",
              cursor: "pointer",
              padding: "4px",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </aside>

      {/* iOS Safari "Add to Home Screen" Instructions Modal */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setShowIosModal(false)}
        >
          <div
            style={{
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "380px",
              width: "100%",
              color: "#ffffff",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ fontSize: "16px", fontWeight: 700 }}>Install on iOS</div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                style={{ background: "transparent", border: "none", color: "#a1a1aa", fontSize: "16px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <ol style={{ paddingLeft: "20px", fontSize: "13px", lineHeight: "22px", color: "#d4d4d8", margin: 0 }}>
              <li>Tap the <strong>Share</strong> icon (square with arrow pointing up) at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              style={{
                marginTop: "20px",
                width: "100%",
                background: "#a3e635",
                color: "#000000",
                border: "none",
                padding: "10px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
