import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StratMarket — Institutional Quant Signals",
    short_name: "StratMarket",
    description:
      "Institutional algorithmic trading strategy marketplace & real-time signal stream by Elvaris Capital (elvariscapital.in)",
    start_url: "/dashboard",
    id: "/dashboard",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "any",
    categories: ["finance", "productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Live Dashboard",
        short_name: "Dashboard",
        description: "View live signals, active alerts, and execution logs",
        url: "/dashboard",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Multi-Strategy Chart",
        short_name: "All Charts",
        description: "Unified overlay chart of all quantitative strategies",
        url: "/chart/all",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Strategy Marketplace",
        short_name: "Marketplace",
        description: "Explore audited quant strategies",
        url: "/market",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
