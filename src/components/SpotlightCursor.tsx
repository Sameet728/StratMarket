"use client";

import { useEffect, useRef } from "react";

export function SpotlightCursor() {
  const curRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cur = curRef.current;
    if (!cur) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let animId: number;
    let hasMoved = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (!hasMoved) {
        hasMoved = true;
        currentX = e.clientX;
        currentY = e.clientY;
      }
      targetX = e.clientX;
      targetY = e.clientY;
      cur.classList.add("visible");

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

    const handleMouseLeave = () => {
      cur.classList.remove("visible");
      cur.classList.remove("h");
    };

    const handleMouseEnter = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      cur.classList.add("visible");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cur.classList.remove("visible");
        cur.classList.remove("h");
      }
    };

    const handleBlur = () => {
      cur.classList.remove("visible");
      cur.classList.remove("h");
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerover", handlePointerOver, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    const loop = () => {
      if (hasMoved) {
        currentX += (targetX - currentX) * 0.32;
        currentY += (targetY - currentY) * 0.32;
        cur.style.transform = `translate3d(${Math.round(currentX)}px, ${Math.round(currentY)}px, 0)`;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return <div id="cur" ref={curRef} aria-hidden="true" />;
}
