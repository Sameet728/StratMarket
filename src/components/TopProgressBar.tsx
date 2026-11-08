"use client";

import { useEffect, useRef } from "react";

export function TopProgressBar() {
  const progRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (progRef.current) {
            const scrollY = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scale = docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;
            progRef.current.style.transform = `scaleX(${scale.toFixed(4)})`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return <div id="prog" ref={progRef} aria-hidden="true" />;
}
