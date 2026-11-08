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
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav
      id="dock"
      ref={dockRef}
      aria-label="Main"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
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

      <Link
        href="/research"
        className="l"
        data-t="Research"
        aria-label="Research"
        aria-current={isActive("/research") ? "true" : undefined}
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
          <circle cx="12" cy="12" r="2.4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        </svg>
      </Link>

      <Link
        href="/how"
        className="l"
        data-t="How it works"
        aria-label="How it works"
        aria-current={isActive("/how") ? "true" : undefined}
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
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="5" r="2" />
          <path d="M7 19h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6" />
        </svg>
      </Link>

      <Link
        href="/docs"
        className="l"
        data-t="Documentation"
        aria-label="Documentation"
        aria-current={isActive("/docs") ? "true" : undefined}
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
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
        </svg>
      </Link>
    </nav>
  );
}
