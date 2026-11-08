"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PageTransitionWipe() {
  const pathname = usePathname();
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip animation on initial page load
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    // Play transition wipe on route changes without intercepting user clicks
    const wp = document.getElementById("wp");
    if (wp) {
      wp.classList.remove("go");
      void wp.offsetWidth;
      wp.classList.add("go");
      const timer = setTimeout(() => {
        wp.classList.remove("go");
      }, 760);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <div id="wp" aria-hidden="true">
      StratMarket
    </div>
  );
}
