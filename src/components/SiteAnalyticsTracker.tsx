"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getOrSetSessionId(): string {
  if (typeof window === "undefined") return "sm_ssr";
  try {
    let sid = window.sessionStorage.getItem("sm_sid");
    if (!sid) {
      sid = "sm_sid_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      window.sessionStorage.setItem("sm_sid", sid);
    }
    return sid;
  } catch (_) {
    return "sm_sid_fallback";
  }
}

function detectDevice(): "DESKTOP" | "MOBILE" | "TABLET" {
  if (typeof window === "undefined") return "DESKTOP";
  const w = window.innerWidth;
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua) || (w >= 768 && w <= 1024 && "ontouchstart" in window)) {
    return "TABLET";
  }
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua) || (w < 768 && "ontouchstart" in window)) {
    return "MOBILE";
  }
  return "DESKTOP";
}

function detectBrowser(): string {
  if (typeof window === "undefined") return "Chrome";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("OPR/") || ua.includes("Opera/")) return "Opera";
  return "Browser";
}

function detectOS(): string {
  if (typeof window === "undefined") return "Windows";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "OS";
}

export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageStartTimeRef = useRef<number>(Date.now());
  const userRef = useRef<{ id?: string; email?: string } | null>(null);

  // Fetch logged in user identity once
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          userRef.current = {
            id: data.user.id,
            email: data.user.email,
          };
        }
      })
      .catch(() => {});
  }, []);

  // Track page view on path change
  useEffect(() => {
    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const sessionId = getOrSetSessionId();
    pageStartTimeRef.current = Date.now();

    const payload = {
      action: "PAGE_VIEW",
      sessionId,
      path: fullPath,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      device: detectDevice(),
      browser: detectBrowser(),
      os: detectOS(),
      screenResolution: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      durationSeconds: 1,
      userId: userRef.current?.id,
      userEmail: userRef.current?.email,
    };

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});

    // Periodic 25-second heartbeat while on the current page
    const interval = setInterval(() => {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - pageStartTimeRef.current) / 1000));
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HEARTBEAT",
          sessionId,
          path: fullPath,
          durationSeconds: elapsedSeconds,
          userId: userRef.current?.id,
          userEmail: userRef.current?.email,
        }),
        keepalive: true,
      }).catch(() => {});
    }, 25000);

    return () => {
      clearInterval(interval);
      // Send final duration on unmount / navigation
      const finalDuration = Math.max(1, Math.round((Date.now() - pageStartTimeRef.current) / 1000));
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HEARTBEAT",
          sessionId,
          path: fullPath,
          durationSeconds: finalDuration,
          userId: userRef.current?.id,
          userEmail: userRef.current?.email,
        }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [pathname, searchParams]);

  return null;
}

