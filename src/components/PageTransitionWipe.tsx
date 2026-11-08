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

    // Play silky 0.58s transition wipe with white bg & StratMarket logo
    const wp = document.getElementById("wp");
    if (wp) {
      wp.classList.remove("go");
      void wp.offsetWidth;
      wp.classList.add("go");
      const timer = setTimeout(() => {
        wp?.classList.remove("go");
      }, 620);
      return () => {
        clearTimeout(timer);
        wp?.classList.remove("go");
      };
    }
  }, [pathname]);

  return (
    <div
      id="wp"
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) {
          (e.currentTarget as HTMLElement).classList.remove("go");
        }
      }}
    >
      <StratMarketLogo size={42} color="#000000" />
      <span>StratMarket</span>
    </div>
  );
}
