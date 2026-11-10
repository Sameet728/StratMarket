import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "Real-Time Telemetry & Site Analytics — Minute Detailed Activity",
  description:
    "Institutional live telemetry across website visitors, dwell time, registered traders, real-time alert subscribers, and algorithmic VPS signal dispatches.",
  openGraph: {
    title: "Real-Time Telemetry & Site Analytics | StratMarket by Elvaris Capital",
    description:
      "Monitor site visitors, user registration timestamps down to the second, alert subscribers, signal delivery logs, and platform telemetry in real time.",
  },
};

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="wrap admin-wrap" style={{ textAlign: "center", minHeight: "60vh", paddingTop: "80px" }}>
          <p className="note">Initializing telemetry stream...</p>
        </div>
      }
    >
      <AnalyticsClient />
    </Suspense>
  );
}
