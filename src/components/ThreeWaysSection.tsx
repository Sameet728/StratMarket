"use client";

import { useState, useEffect } from "react";
import { DemoPreviewModal } from "./DemoPreviewModal";

const ALERTS_FEED = [
  "Entry signal · PS-01 · XAUUSD (Long)",
  "Exit signal · PS-02 · XAUUSD (Take profit)",
  "Trend continuation · PS-03 · XAUUSD (Long)",
  "Stop-loss adjusted · PS-04 · XAUUSD",
];

export function ThreeWaysSection() {
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [currentAlerts, setCurrentAlerts] = useState<string[]>([
    "Entry signal · PS-01 · XAUUSD (Long)",
    "Exit signal · PS-02 · XAUUSD (Take profit)",
  ]);

  useEffect(() => {
    let index = 2;
    const interval = setInterval(() => {
      const nextAlert = ALERTS_FEED[index % ALERTS_FEED.length];
      index++;
      setCurrentAlerts((prev) => [nextAlert, prev[0]]);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="b" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <h2>Two core ways to use a strategy.</h2>
        <p className="lede">
          Visual demonstrations of StratMarket strategy modes: interactive live candlestick charts and automated real-time email signal alerts.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {/* 1. View on chart */}
          <button
            type="button"
            className="fc"
            style={{ touchAction: "manipulation" }}
            onClick={() =>
              setDemoMessage(
                "View on Chart: Interactive overlay that plots Elvaris quantitative entry, stop-loss, and target points directly against the historical candlestick series."
              )
            }
          >
            <svg viewBox="0 0 200 60">
              <path
                d="M0,50 C30,40 40,20 70,30 S120,50 150,20 S190,10 200,8"
                fill="none"
                stroke="var(--lime, #a3e635)"
                strokeWidth="2.2"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset="1"
                style={{ filter: "drop-shadow(0 0 4px rgba(163, 230, 53, 0.4))" }}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="1"
                  to="0"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
            <h3>View on live chart</h3>
            <p>See entries and exits plotted on price.</p>
          </button>

          {/* 2. Receive email alerts */}
          <button
            type="button"
            className="fc"
            style={{ touchAction: "manipulation" }}
            onClick={() =>
              setDemoMessage(
                "Receive Email Alerts: StratMarket dispatches immediate notifications to your verified email within milliseconds of signal generation on the Elvaris VPS."
              )
            }
          >
            <div id="al" style={{ minHeight: "68px" }}>
              {currentAlerts.map((a, i) => (
                <div key={i} className="alert" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a3e635", boxShadow: "0 0 6px #a3e635", flexShrink: 0 }} />
                  <span>{a}</span>
                </div>
              ))}
            </div>
            <h3>Receive email alerts</h3>
            <p>Get each signal as it is generated.</p>
          </button>
        </div>
      </div>

      {demoMessage && (
        <DemoPreviewModal
          message={demoMessage}
          onClose={() => setDemoMessage(null)}
        />
      )}
    </section>
  );
}
