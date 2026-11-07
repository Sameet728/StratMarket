"use client";

import { useEffect, useRef } from "react";

export function TerrainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    let T = 0;
    let mx = 0;
    let sm = 0;
    let vis = true;
    let animId: number;
    let lastRenderTime = 0;
    const FRAME_INTERVAL = 1000 / 38; // Silky smooth 38 fps cap saves up to 70% CPU/battery

    const N = 22; // Clean, high-fidelity wireframe rows
    const M = 48; // Optimized column points

    // Precalculate column envelopes once: exp(-((u / 0.26)^2))
    const envLookup = new Float32Array(M);
    for (let c = 0; c < M; c++) {
      const u = c / (M - 1) - 0.5;
      envLookup[c] = Math.exp(-Math.pow(u / 0.26, 2));
    }

    // Precalculate row vertical constants
    const rowT = new Float32Array(N);
    const rowSc = new Float32Array(N);
    const rowStroke = new Array<string>(N);
    const rowLineWidth = new Float32Array(N);
    for (let r = 0; r < N; r++) {
      const t = r / (N - 1);
      rowT[r] = t;
      rowSc[r] = 0.25 + t * 1.05;
      rowStroke[r] = `rgba(255, 255, 255, ${(0.1 + t * 0.82).toFixed(2)})`;
      rowLineWidth[r] = 0.6 + t * 1.1;
    }

    const rs = () => {
      if (!cv) return;
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    rs();
    let resizeTimer: any = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rs, 100);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const onPointerMove = (e: PointerEvent) => {
      mx = (e.clientX / (window.innerWidth || 1) - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        vis = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(cv);

    const render = () => {
      if (!W) rs();
      sm += (mx - sm) * 0.05;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
      const hz = H * 0.1;

      for (let r = 0; r < N; r++) {
        const t = rowT[r];
        const ty = hz + Math.pow(t, 1.7) * (H - hz - 6);
        const sc = rowSc[r];
        const amp = H * 0.5 * (0.25 + t * 0.9);
        const p = r - T;
        const xOffset = W / 2 + sm * t * 70;
        const xFactor = W * sc * 1.1;
        let fx0 = 0;
        let fx1 = 0;

        ctx.beginPath();
        for (let c = 0; c < M; c++) {
          const u = c / (M - 1) - 0.5;
          const env = envLookup[c];
          const v = Math.abs(
            Math.sin(c * 0.33 + p * 0.55) * 0.5 +
              Math.sin(c * 0.81 - p * 0.9) * 0.3 +
              Math.sin(c * 1.9 + p * 1.7) * 0.2
          );
          const px = xOffset + u * xFactor;
          const py = ty - env * v * amp * 0.55;

          if (c === 0) {
            fx0 = px;
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
          fx1 = px;
        }

        ctx.lineTo(fx1, H + 2);
        ctx.lineTo(fx0, H + 2);
        ctx.closePath();
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.strokeStyle = rowStroke[r];
        ctx.lineWidth = rowLineWidth[r];
        ctx.stroke();
      }
    };

    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);
      if (!vis || document.hidden) return;

      if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
        lastRenderTime = timestamp;
        T += 0.045;
        render();
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      observer.disconnect();
    };
  }, []);

  return <canvas id="tr" ref={canvasRef} aria-hidden="true" />;
}
