"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { StratMarketLogo } from "@/components/StratMarketLogo";

export function PageTransitionWipe() {
  const pathname = usePathname();
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip animation on initial page load
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    // Skip wipe on fullscreen chart terminal
    if (pathname?.startsWith("/chart")) {
      return;
    }

    // Play transition wipe on route / tab changes without intercepting user clicks
    const wp = document.getElementById("wp");
    if (wp) {
      wp.classList.remove("go");
      void wp.offsetWidth;
      wp.classList.add("go");
      const timer = setTimeout(() => {
        wp?.classList.remove("go");
      }, 720);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <div id="wp" aria-hidden="true">
      <StratMarketLogo size={40} color="#000000" />
      <span>StratMarket</span>
    </div>
  );
}
