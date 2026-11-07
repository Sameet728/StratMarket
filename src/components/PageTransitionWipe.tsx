"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export function PageTransitionWipe() {
  const [isWiping, setIsWiping] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let timer1: any = null;
    let timer2: any = null;

    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !target.hasAttribute("download") &&
        target.target !== "_blank" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // Don't re-wipe on current path or anchor links
        if (href === pathname || href.startsWith("#")) return;

        e.preventDefault();

        // 1. Immediately prefetch route so Next.js loads the code in parallel
        try {
          router.prefetch(href);
        } catch (_) {}

        // 2. Trigger high-performance GPU white wipe curtain
        const wp = document.getElementById("wp");
        if (wp) {
          wp.classList.remove("go");
          // Fast reflow trigger
          void wp.offsetWidth;
          wp.classList.add("go");
        }
        setIsWiping(true);

        // 3. Switch route at the exact apex (when white curtain covers screen 100%)
        clearTimeout(timer1);
        timer1 = setTimeout(() => {
          startTransition(() => {
            router.push(href);
          });
        }, 300);

        // 4. Reset class cleanly once wipe reveals new screen
        clearTimeout(timer2);
        timer2 = setTimeout(() => {
          if (wp) {
            wp.classList.remove("go");
          }
          setIsWiping(false);
        }, 780);
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [pathname, router]);

  return (
    <div id="wp" className={isWiping ? "go" : ""} aria-hidden="true">
      StratMarket
    </div>
  );
}
