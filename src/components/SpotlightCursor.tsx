"use client";

import { useEffect } from "react";

export function SpotlightCursor() {
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const targetCard = (e.target as HTMLElement | null)?.closest(
        ".card, .fc, .plan, .st, .stage, .report-card, .metric-card"
      ) as HTMLElement | null;
      if (targetCard) {
        const rect = targetCard.getBoundingClientRect();
        targetCard.style.setProperty("--cx", `${Math.round(e.clientX - rect.left)}px`);
        targetCard.style.setProperty("--cy", `${Math.round(e.clientY - rect.top)}px`);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return null;
}
