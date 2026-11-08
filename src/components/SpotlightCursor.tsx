"use client";

import { useEffect, useRef } from "react";

export function SpotlightCursor() {
  const curRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cur = curRef.current;
    if (!cur) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let animId: number;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      const targetCard = (e.target as HTMLElement | null)?.closest(
        ".card, .fc, .plan, .st, .stage, .report-card, .metric-card"
      ) as HTMLElement | null;
      if (targetCard) {
        const rect = targetCard.getBoundingClientRect();
        targetCard.style.setProperty("--cx", `${Math.round(e.clientX - rect.left)}px`);
        targetCard.style.setProperty("--cy", `${Math.round(e.clientY - rect.top)}px`);
      }
    };

    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const isInteractive = target?.closest("a, button, input, select, .card, .fc, .ir, summary");
      cur.classList.toggle("h", Boolean(isInteractive));
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerover", handlePointerOver, { passive: true });

    const loop = () => {
      currentX += (targetX - currentX) * 0.28;
      currentY += (targetY - currentY) * 0.28;
      cur.style.transform = `translate3d(${Math.round(currentX)}px, ${Math.round(currentY)}px, 0)`;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerover", handlePointerOver);
    };
  }, []);

  return <div id="cur" ref={curRef} aria-hidden="true" />;
}
