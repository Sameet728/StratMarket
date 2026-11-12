"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

export function DockNav() {
  const pathname = usePathname();
  const dockRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);

  if (pathname?.startsWith("/chart")) {
    return null;
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !dockRef.current) return;
    const mouseX = e.clientX;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!dockRef.current) return;
      const links = dockRef.current.querySelectorAll<HTMLAnchorElement>("a.l");
      links.forEach((link) => {
        const rect = link.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const d = Math.abs(mouseX - center);
        const scaleVal = Math.exp((-d * d) / 6050).toFixed(3);
        link.style.setProperty("--g", scaleVal);
      });
    });
  };

  const handlePointerLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!dockRef.current) return;
    const links = dockRef.current.querySelectorAll<HTMLAnchorElement>("a.l");
    links.forEach((link) => {
      link.style.setProperty("--g", "0");
    });
  };

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/" && pathname === "/") return true;
    if (path === "/chart/all" && pathname.startsWith("/chart")) return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav
      id="dock"
      ref={dockRef}
      aria-label="Main Navigation Dock"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* 1. Home */}
      <Link
        href="/"
        className="l"
        data-t="Home"
        aria-label="Home"
        aria-current={isActive("/") ? "true" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </Link>

      {/* 2. Marketplace */}
      <Link
        href="/market"
        className="l"
        data-t="Marketplace"
        aria-label="Marketplace"
        aria-current={isActive("/market") ? "true" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </Link>

      {/* 3. Dashboard */}
      <Link
        href="/dashboard"
        className="l"
        data-t="Dashboard"
        aria-label="Dashboard"
        aria-current={isActive("/dashboard") ? "true" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      </Link>

      {/* 4. Chart */}
      <Link
        href="/chart/all"
        className="l"
        data-t="Charts"
        aria-label="Charts"
        aria-current={isActive("/chart/all") ? "true" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M19 9l-5 5-4-4-3 3" />
        </svg>
      </Link>

      {/* 5. Profile */}
      <Link
        href="/profile"
        className="l"
        data-t="Profile"
        aria-label="Profile"
        aria-current={isActive("/profile") ? "true" : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>
    </nav>
  );
}
