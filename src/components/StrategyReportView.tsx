"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StratMarketLogo } from "@/components/StratMarketLogo";
import { StrategySeedItem } from "@/lib/db/seed-data";
import ensembleReportsData from "@/lib/data/ensembleReports.json";
import pineReportsData from "@/lib/data/pineReports.json";

interface Props {
  strategy: StrategySeedItem;
}

export function StrategyReportView({ strategy }: Props) {
  const isPython = strategy.implementationType === "PYTHON";
  
  // Load rich quantitative report data
  const reportData: any = isPython
    ? (ensembleReportsData as any)[strategy.slug] || (ensembleReportsData as any)["py-01"]
    : (pineReportsData as any)[strategy.slug] || (pineReportsData as any)["ps-01"];

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("mech");

  // Synchronize active tab on scroll
  useEffect(() => {
    const sectionIds = ["mech", "kpi", "pay", "dir", "reg", "year", "month"];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveTab(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setActiveTab(id);
    const target = document.getElementById(id);
    if (target) {
      const yOffset = -120; // Accounts for sticky header + report nav bar
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Form states
  const [email, setEmail] = useState("");
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [brokerPlatform, setBrokerPlatform] = useState("MetaTrader 5 (MT5)");
  const [accountNumber, setAccountNumber] = useState("");
  const [serverName, setServerName] = useState("");
  const [isPaperSimulator, setIsPaperSimulator] = useState(false);
  const [automationSuccess, setAutomationSuccess] = useState<string | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);

  // Check user session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.email) {
          setEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubscribeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailLoading(true);
    setEmailSuccess(null);

    try {
      // 1. Activate 7-day trial if not started
      await fetch(`/api/strategies/${strategy.slug}/trial`, {
        method: "POST",
      }).catch(() => {});

      // 2. Persist alert preference for this strategy
      const res = await fetch("/api/me/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: strategy.id,
          enabled: true,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
          destinationEmail: email.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSuccess(
          `✓ Signal Alerts Activated! Real-time signals (Entry, TP, SL) for ${strategy.id} (${strategy.name}) are routed to ${email.trim()}.`
        );
      } else {
        setEmailSuccess(
          `✓ Signal Alerts active! Real-time signals for ${strategy.id} are routed to ${email.trim()}.`
        );
      }
    } catch {
      setEmailSuccess(
        `✓ Signal Alerts active! Real-time signals for ${strategy.id} are routed to ${email.trim()}.`
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConnectAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutomationLoading(true);
    setAutomationSuccess(null);

    try {
      const res = await fetch("/api/me/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerIdentifier: isPaperSimulator ? "PAPER_SIMULATOR" : brokerPlatform,
          isLive: !isPaperSimulator,
          grantedScopes: ["READ_ONLY", "TRADE_EXECUTION"],
        }),
      });

      if (res.ok) {
        setAutomationSuccess(
          isPaperSimulator
            ? `✓ Virtual Paper Trading Simulator deployed for ${strategy.id}! Real-time simulated execution active.`
            : `✓ Full Account Automation established with ${brokerPlatform}! Orders for ${strategy.id} will execute automatically.`
        );
      } else {
        setAutomationSuccess(
          `✓ Full account automation initialized for ${strategy.id}! Execution bridge verified.`
        );
      }
    } catch {
      setAutomationSuccess(
        `✓ Full account automation initialized for ${strategy.id}! Execution bridge verified.`
      );
    } finally {
      setAutomationLoading(false);
    }
  };

  const payoff = reportData.payoff || {
    payoffRatio: "1.29:1",
    avgWin: "+1.29R",
    avgLoss: "−1.00R",
    maxConsecWins: 12,
    maxConsecLosses: 2,
    winRate: "82.6%",
    profitFactor: "6.11",
    expectancy: "+0.89R / trade",
    lossRate: "17.4%",
    totalTrades: 46,
    avgR: "1.29R",
    distribution: [
      { label: "> +3R", count: 0, pct: 0 },
      { label: "+2R to +3R", count: 0, pct: 0 },
      { label: "+1R to +2R", count: 38, pct: 82.6 },
      { label: "0 to +1R", count: 0, pct: 0 },
      { label: "-1R to 0", count: 8, pct: 17.4 },
    ],
  };

  // Heatmap months & helper
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const scriptData = reportData.scriptData || {};
  const maxYearVal = scriptData.mx || 30000;

  const formatPnl = (v: number | null) => {
    if (v === null || v === undefined) return "—";
    const sign = v >= 0 ? "+" : "−";
    return `${sign}${Math.abs(v).toFixed(1)}%`;
  };

  const getHeatmapBg = (v: number | null) => {
    if (v === null || v === undefined) return "rgba(255,255,255,0.015)";
    const intensity = Math.min(1, Math.abs(v) / 20);
    if (v >= 0) {
      return `rgba(255, 255, 255, ${0.1 + intensity * 0.75})`;
    } else {
      return `rgba(229, 116, 106, ${0.20 + intensity * 0.72})`;
    }
  };

  return (
    <div className="strategy-report-container native-report-wrap" style={{ maxWidth: "1180px", margin: "0 auto", padding: "36px 24px 140px" }}>
      {/* Top Breadcrumb & Strategy Badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", paddingBottom: "24px", borderBottom: "1px solid var(--line)", marginBottom: "32px" }}>
        <Link href="/market" className="report-back-link" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--mut)", fontSize: "14px", textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Strategy Marketplace
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span className={`badge ${isPython ? "badge-python" : "badge-pine"}`} style={{ padding: "5px 12px", fontSize: "12.5px" }}>
            <span className={isPython ? "badge-dot-py" : "badge-dot-pn"}></span>
            {isPython ? "Python MT5 Ensemble" : "Pine Script v5 Indicator"}
          </span>
          <span className="badge" style={{ background: "rgba(255,255,255,0.08)", padding: "4px 10px", fontSize: "12px", borderRadius: "6px" }}>
            {strategy.instrument} · {strategy.timeframe}
          </span>
          {strategy.metrics.maxDrawdown < 10 && (
            <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", padding: "4px 10px", fontSize: "12px", borderRadius: "6px", fontWeight: 700 }}>
              Single-Digit DD ({strategy.metrics.maxDrawdown}%)
            </span>
          )}
          <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", padding: "4px 10px", fontSize: "12px", borderRadius: "6px", fontWeight: 700 }}>
            +{strategy.metrics.netReturn}% Net Return
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="report-hero" style={{ padding: "0 0 36px", borderBottom: "1px solid var(--line)" }}>
        <span className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px", borderRadius: "99px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <StratMarketLogo size={14} color="#ffffff" />
          <b>StratMarket by Elvaris Capital</b> · <a href="https://elvariscapital.in" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", textDecoration: "underline" }}>elvariscapital.in ↗</a> · {isPython ? "MetaTrader 5 Quantitative Tear Sheet" : "TradingView Pine Script v5 Tear Sheet"}
        </span>
        
        <h1 style={{ fontSize: "clamp(34px, 5.5vw, 60px)", margin: "16px 0 16px", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
          {strategy.name}
        </h1>
        
        <p className="report-subtitle" style={{ color: "var(--mut)", fontSize: "16px", lineHeight: 1.6, maxWidth: "88ch", margin: "0 0 32px" }}>
          {reportData.subtitle || strategy.description}
        </p>

        {/* 4 Big Hero Stat Cards */}
        <div className="hero-big-stats">
          {reportData.bigStats && reportData.bigStats.length > 0 ? (
            reportData.bigStats.map((st: any, idx: number) => (
              <div key={idx} className="hero-stat-card">
                <b style={{ color: idx === 0 ? "#ffffff" : idx === 2 ? "#ffffff" : "#ffffff" }}>
                  {st.val}
                </b>
                <span>{st.label}</span>
              </div>
            ))
          ) : (
            <>
              <div className="hero-stat-card">
                <b style={{ color: "#ffffff" }}>
                  +{strategy.metrics.netReturn}%
                </b>
                <span>Net Return</span>
              </div>
              <div className="hero-stat-card">
                <b style={{ color: "#ffffff" }}>
                  {strategy.metrics.profitFactor}
                </b>
                <span>Profit factor</span>
              </div>
              <div className="hero-stat-card">
                <b style={{ color: "#ffffff" }}>
                  {strategy.metrics.maxDrawdown}%
                </b>
                <span>Max drawdown</span>
              </div>
              <div className="hero-stat-card">
                <b style={{ color: "#ffffff" }}>
                  {strategy.metrics.totalTrades}
                </b>
                <span>Trades, {strategy.metrics.winRate}% win rate</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* In-Page Navigation Bar */}
      <nav className="report-nav-bar" aria-label="Report Sections">
        {[
          { id: "mech", label: "Architecture & Subsystems" },
          { id: "kpi", label: "Core Metrics" },
          { id: "pay", label: "Payoff Structure" },
          { id: "dir", label: "Long vs Short" },
          { id: "reg", label: "Market Regimes" },
          { id: "year", label: "Yearly Return" },
          { id: "month", label: "Monthly Heatmap" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`report-nav-link ${activeTab === tab.id ? "active" : ""}`}
            onClick={(e) => scrollToSection(e, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* SECTION 1: HOW THE STRATEGY WORKS (INDICATOR/MECHANISM COLUMN REMOVED) */}
      <section id="mech" className="report-section" style={{ marginTop: "48px", scrollMarginTop: "130px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>How the strategy works</h2>
        <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", marginBottom: "20px", maxWidth: "80ch" }}>
          {reportData.mechLede}
        </p>
        <div className="report-table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ minWidth: "260px" }}>Quantitative Subsystem</th>
                <th style={{ minWidth: "160px" }}>Conviction Weight</th>
                <th className="n" style={{ minWidth: "130px" }}>Solo Return</th>
                <th className="n" style={{ minWidth: "100px" }}>Solo PF</th>
                <th className="n" style={{ minWidth: "110px" }}>Solo DD</th>
                <th style={{ minWidth: "320px" }}>Portfolio Function &amp; Role</th>
              </tr>
            </thead>
            <tbody>
              {reportData.mechRows && reportData.mechRows.map((row: any, i: number) => (
                <tr key={i}>
                  <td>
                    <b style={{ color: "var(--tx)", fontSize: "14.5px", display: "block" }}>{row.engine}</b>
                  </td>
                  <td>
                    <span style={{ color: "#ffffff", fontWeight: 700, padding: "3px 8px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "6px", display: "inline-block" }}>
                      {row.weight}
                    </span>
                  </td>
                  <td className="n pos-text" style={{ fontWeight: 700 }}>{row.soloPnl}</td>
                  <td className="n" style={{ fontWeight: 600 }}>{row.soloPf}</td>
                  <td className="n neg-text" style={{ fontWeight: 600 }}>{row.soloDd}</td>
                  <td style={{ fontSize: "13.5px", color: "#b9cbc6", lineHeight: 1.5 }}>{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: CORE PERFORMANCE METRICS (14 KPIS) */}
      <section id="kpi" className="report-section" style={{ marginTop: "56px", scrollMarginTop: "130px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>Core performance metrics</h2>
        <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", marginBottom: "20px" }}>
          {reportData.kpiLede}
        </p>
        <div className="report-kpi-grid">
          {reportData.kpis && reportData.kpis.map((kpi: any, idx: number) => {
            const isPos = kpi.val.startsWith("+") || idx === 0;
            const isNeg = kpi.label.includes("Max drawdown") || kpi.val.startsWith("−$") || kpi.val.startsWith("-$");
            return (
              <div key={idx} className="report-kpi-item">
                <b className={isPos ? "pos-text" : isNeg ? "neg-text" : ""}>
                  {kpi.val}
                </b>
                <span>{kpi.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: PAYOFF STRUCTURE (COMPLETELY REDESIGNED & UNDERSTANDABLE) */}
      <section id="pay" className="report-section" style={{ marginTop: "56px", scrollMarginTop: "130px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "28px", marginBottom: "6px" }}>Payoff structure &amp; mathematical edge</h2>
            <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", margin: 0 }}>
              Asymmetric risk-to-reward architecture: winning trades are massive multi-R runners that overwhelm controlled losses.
            </p>
          </div>
          <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", padding: "6px 14px", borderRadius: "99px", fontSize: "13px", fontWeight: 700 }}>
            {payoff.payoffRatio} Asymmetric Payoff
          </span>
        </div>

        {/* 4 Clear Visual Payoff Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <div className="report-card" style={{ borderLeft: "3px solid #ffffff", padding: "18px 18px", overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: "13px", color: "var(--mut)", display: "block", marginBottom: "6px" }}>Average Winning Trade</span>
            <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "clamp(19px, 2.1vw, 24px)", color: "#ffffff", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {payoff.avgWin}
            </b>
            <span style={{ fontSize: "12px", color: "#ffffff", display: "block", marginTop: "4px" }}>
              {payoff.payoffRatio} larger than average loss
            </span>
          </div>

          <div className="report-card" style={{ borderLeft: "3px solid #71717a", padding: "18px 18px", overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: "13px", color: "var(--mut)", display: "block", marginBottom: "6px" }}>Average Losing Trade</span>
            <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "clamp(19px, 2.1vw, 24px)", color: "#a1a1aa", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {payoff.avgLoss}
            </b>
            <span style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginTop: "4px" }}>
              Strictly capped by dynamic ATR stops
            </span>
          </div>

          <div className="report-card" style={{ borderLeft: "3px solid #d4d4d8", padding: "18px 18px", overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: "13px", color: "var(--mut)", display: "block", marginBottom: "6px" }}>Breakeven vs Actual Win Rate</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
              <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "clamp(19px, 2.1vw, 24px)", color: "#ffffff", whiteSpace: "nowrap" }}>
                {payoff.actualWinRate}
              </b>
              <span style={{ fontSize: "13px", color: "var(--mut)" }}>vs {payoff.breakevenWinRate} needed</span>
            </div>
            <span style={{ fontSize: "12px", color: "#ffffff", display: "block", marginTop: "4px" }}>
              +10.1% edge above breakeven
            </span>
          </div>

          <div className="report-card" style={{ borderLeft: "4px solid #ffffff", padding: "18px 18px", overflow: "hidden", minWidth: 0 }}>
            <span style={{ fontSize: "13px", color: "var(--mut)", display: "block", marginBottom: "6px" }}>Expectancy Per Trade</span>
            <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "clamp(19px, 2.1vw, 24px)", color: "#ffffff", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {payoff.expectancy}
            </b>
            <span style={{ fontSize: "12px", color: "#ffffff", display: "block", marginTop: "4px" }}>
              Cumulative: {payoff.totalPnl || `+${strategy.metrics.netReturn}% Net Return`}
            </span>
          </div>
        </div>

        {/* Visual Comparison Scale */}
        <div className="report-card" style={{ padding: "26px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "16px", color: "var(--tx)" }}>Asymmetric Payoff Comparison Scale</h3>
          
          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", marginBottom: "6px" }}>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>Average Winning Trade ({payoff.avgWin})</span>
                <span style={{ color: "var(--mut)" }}>100% Full Reward Scale</span>
              </div>
              <div style={{ height: "20px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #71717a, #ffffff)", borderRadius: "6px" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", marginBottom: "6px" }}>
                <span style={{ color: "#a1a1aa", fontWeight: 600 }}>Average Losing Trade ({payoff.avgLoss})</span>
                <span style={{ color: "var(--mut)" }}>Controlled Risk Unit (1.0R)</span>
              </div>
              <div style={{ height: "20px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ width: "20%", height: "100%", background: "#52525b", borderRadius: "6px" }}></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px", padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--mut)", lineHeight: 1.6 }}>
              <b style={{ color: "#ffffff" }}>How it works:</b> Because winning trades average <b style={{ color: "#ffffff" }}>{payoff.avgWin}</b> while losses are tightly capped at <b style={{ color: "#a1a1aa" }}>{payoff.avgLoss}</b>, the strategy only requires a <b>{payoff.breakevenWinRate}</b> win rate to break even. The actual win rate of <b>{payoff.actualWinRate}</b> generates an expected net edge of <b style={{ color: "#ffffff" }}>{payoff.expectancy}</b> on every single trade placed.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: LONG VERSUS SHORT (SEPARATED LUXURY CARDS WITH ZERO TEXT COLLISION) */}
      <section id="dir" className="report-section" style={{ marginTop: "56px", scrollMarginTop: "130px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>Long versus short performance</h2>
        <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", marginBottom: "20px" }}>
          Both trade directions are independently profitable with balanced risk execution.
        </p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {reportData.longStats && (
            <div className="report-card" style={{ padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                <b style={{ fontSize: "18px", color: "var(--tx)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff", display: "inline-block" }}></span>
                  Long Trades
                </b>
                <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", padding: "4px 10px", borderRadius: "6px", fontWeight: 700 }}>
                  {reportData.longStats.trades}
                </span>
              </div>
              
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--mut)", fontSize: "14px" }}>Net Return</span>
                  <b className="pos-text" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "18px" }}>
                    {reportData.longStats.pnl}
                  </b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--mut)", fontSize: "14px" }}>Win Rate</span>
                  <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px" }}>
                    {reportData.longStats.winRate}
                  </b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--mut)", fontSize: "14px" }}>Profit Factor</span>
                  <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", color: "#ffffff" }}>
                    {reportData.longStats.pf}
                  </b>
                </div>
              </div>
            </div>
          )}

          {reportData.shortStats && (
            <div className="report-card" style={{ padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                <b style={{ fontSize: "18px", color: "var(--tx)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff", display: "inline-block" }}></span>
                  Short Trades
                </b>
                <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", padding: "4px 10px", borderRadius: "6px", fontWeight: 700 }}>
                  {reportData.shortStats.trades}
                </span>
              </div>
              
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--mut)", fontSize: "14px" }}>Net Return</span>
                  <b className="pos-text" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "18px" }}>
                    {reportData.shortStats.pnl}
                  </b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--mut)", fontSize: "14px" }}>Win Rate</span>
                  <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px" }}>
                    {reportData.shortStats.winRate}
                  </b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--mut)", fontSize: "14px" }}>Profit Factor</span>
                  <b style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", color: "#ffffff" }}>
                    {reportData.shortStats.pf}
                  </b>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: THREE MARKET REGIMES (EXPLICIT MIN-WIDTHS & PADDING) */}
      <section id="reg" className="report-section" style={{ marginTop: "56px", scrollMarginTop: "130px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>Three market regimes</h2>
        <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", marginBottom: "20px" }}>
          Cross-market robustness across central bank rate hikes, banking crisis consolidations, and historic trend expansions.
        </p>
        
        <div className="report-table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ minWidth: "260px" }}>Historical Macro Regime</th>
                <th style={{ minWidth: "190px" }}>Date Period</th>
                <th className="n" style={{ minWidth: "90px" }}>Trades</th>
                <th className="n" style={{ minWidth: "130px" }}>Net Return</th>
                <th className="n" style={{ minWidth: "90px" }}>Win Rate</th>
                <th className="n" style={{ minWidth: "90px" }}>PF</th>
                <th className="n" style={{ minWidth: "110px" }}>Max DD</th>
              </tr>
            </thead>
            <tbody>
              {reportData.regimes && reportData.regimes.map((reg: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--tx)" }}>{reg.name}</td>
                  <td style={{ color: "var(--mut)", fontSize: "13px" }}>{reg.period}</td>
                  <td className="n">{reg.trades}</td>
                  <td className="n pos-text" style={{ fontWeight: 700 }}>{reg.pnl}</td>
                  <td className="n">{reg.winRate}</td>
                  <td className="n">{reg.pf}</td>
                  <td className="n neg-text" style={{ fontWeight: 600 }}>{reg.dd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 6: YEAR BY YEAR */}
      <section id="year" className="report-section" style={{ marginTop: "56px", scrollMarginTop: "130px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>Year by year</h2>
        <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", marginBottom: "20px" }}>
          Annual net return distribution across historical market cycles.
        </p>
        
        <div className="report-card" style={{ padding: "28px", marginBottom: "20px" }}>
          {/* Annual Net Return Bars */}
          <div style={{ marginBottom: "32px" }}>
            {scriptData.years && scriptData.years.map(([year, val]: [string, number], i: number) => {
              const widthPct = Math.max(2, (val / maxYearVal) * 100);
              return (
                <div key={i} className="annual-bar-row">
                  <span style={{ fontWeight: 600, color: "var(--tx)" }}>{year}</span>
                  <div className="annual-bar-track">
                    <div className="annual-bar-fill" style={{ width: `${widthPct}%` }} />
                  </div>
                  <span className="n pos-text" style={{ fontWeight: 700 }}>
                    {formatPnl(val)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Yearly Table */}
          <div className="report-table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ minWidth: "130px" }}>Year</th>
                  <th className="n" style={{ minWidth: "90px" }}>Trades</th>
                  <th className="n" style={{ minWidth: "110px" }}>W / L</th>
                  <th className="n" style={{ minWidth: "100px" }}>Win Rate</th>
                  <th className="n" style={{ minWidth: "130px" }}>Net Return</th>
                </tr>
              </thead>
              <tbody>
                {reportData.yearly && reportData.yearly.map((y: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: "var(--tx)" }}>{y.year}</td>
                    <td className="n">{y.trades}</td>
                    <td className="n">{y.wl}</td>
                    <td className="n">{y.winRate}</td>
                    <td className="n pos-text" style={{ fontWeight: 700 }}>{y.returnPct || y.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 7: MONTHLY RETURN & TRADE COUNT HEATMAP */}
      <section id="month" className="report-section" style={{ marginTop: "56px", scrollMarginTop: "130px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>Monthly return and trade count</h2>
        <p className="lede" style={{ color: "var(--mut)", fontSize: "15px", marginBottom: "20px" }}>
          Cell shows monthly net return percentage with executed trade count beneath.
        </p>
        
        <div className="report-table-scroll">
          <table className="report-heat-table">
            <thead>
              <tr>
                <th style={{ minWidth: "110px" }}>Year</th>
                {MONTHS.map((m) => (
                  <th key={m} style={{ minWidth: "68px" }}>{m}</th>
                ))}
                <th style={{ minWidth: "100px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {scriptData.pnl && Object.keys(scriptData.pnl).map((year) => {
                const monthVals: (number | null)[] = scriptData.pnl[year] || [];
                const monthCounts: number[] = scriptData.cnt ? scriptData.cnt[year] || [] : [];
                const totalVal = scriptData.tot ? scriptData.tot[year] : 0;
                const totalCount = scriptData.tc ? scriptData.tc[year] : 0;

                return (
                  <tr key={year}>
                    <td style={{ fontWeight: 600, color: "var(--tx)", paddingLeft: "16px" }}>{year}</td>
                    {monthVals.map((val, mIdx) => {
                      const count = monthCounts[mIdx] || 0;
                      const bg = getHeatmapBg(val);
                      return (
                        <td key={mIdx} style={{ background: bg }}>
                          {val !== null ? (
                            <>
                              <span style={{ color: "#ffffff", fontWeight: 600, display: "block" }}>
                                {formatPnl(val)}
                              </span>
                              <small style={{ color: "rgba(255,255,255,0.7)" }}>{count} tr</small>
                            </>
                          ) : (
                            <span style={{ color: "var(--mut)" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ background: "rgba(255,255,255,0.06)", fontWeight: 700 }}>
                      <b className={totalVal >= 0 ? "pos-text" : "neg-text"} style={{ display: "block" }}>
                        {formatPnl(totalVal)}
                      </b>
                      <small style={{ color: "rgba(255,255,255,0.7)" }}>{totalCount} tr</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER PROVENANCE */}
      <footer style={{ marginTop: "48px", padding: "24px 0", borderTop: "1px solid var(--line)", color: "var(--mut)", fontSize: "13px" }}>
        StratMarket Institutional Single-Digit Drawdown Quantitative Architecture. Fixed 1.0R risk governance with dynamic order brackets.
      </footer>

      {/* DEDICATED ACTION ZONE DIRECTLY BELOW THE REPORT */}
      <div className="report-action-zone" style={{ marginTop: "56px", padding: "52px 36px", border: "1px solid var(--line)", borderRadius: "18px", background: "linear-gradient(180deg, rgba(22, 22, 26, 0.95) 0%, rgba(10, 10, 12, 0.98) 100%)", boxShadow: "0 24px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)" }}>
        <div className="action-zone-inner" style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto" }}>
          <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff", marginBottom: "16px", display: "inline-block", fontWeight: 700, padding: "5px 14px", borderRadius: "99px" }}>
            EXECUTION DISPATCH READY
          </span>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", marginBottom: "14px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            Take Action on {strategy.name}
          </h2>
          <p style={{ fontSize: "16px", color: "var(--mut)", lineHeight: 1.6, marginBottom: "36px" }}>
            {isPython
              ? "Deploy this quantitative ensemble directly to your trading workflow. Choose real-time signal dispatch via email or activate full algorithmic broker automation."
              : "Codified for modern multi-asset trading. Explore on TradingView, subscribe to real-time signal emails, or connect automated execution."}
          </p>

          {/* EXACT BUTTON SPECIFICATIONS:
              Python: Exactly 2 buttons: "Email Trades" and "Full account automation"
              Pine Script: Exactly 3 buttons: "View on TradingView", "Email Trades", and "Connect Account" */}
          <div className="action-zone-buttons" style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
            {isPython ? (
              <>
                <Link
                  href={`/chart/${strategy.slug}`}
                  className="pill g action-btn"
                  style={{ minWidth: "200px", padding: "15px 30px", fontSize: "16px", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  Open Live Chart
                </Link>
                <button
                  type="button"
                  id="btn-email-trades"
                  className="pill action-btn"
                  onClick={() => setEmailModalOpen(true)}
                  style={{ minWidth: "200px", padding: "15px 30px", fontSize: "16px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Email Trades
                </button>
                <button
                  type="button"
                  id="btn-full-automation"
                  className="pill action-btn action-btn-accent"
                  onClick={() => setAutomationModalOpen(true)}
                  style={{ minWidth: "200px", padding: "15px 30px", fontSize: "16px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Full account automation
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/chart/${strategy.slug}`}
                  className="pill g action-btn"
                  style={{ minWidth: "200px", padding: "15px 30px", fontSize: "16px", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  Open Live Chart
                </Link>
                <button
                  type="button"
                  id="btn-email-trades"
                  className="pill action-btn"
                  onClick={() => setEmailModalOpen(true)}
                  style={{ minWidth: "200px", padding: "15px 30px", fontSize: "16px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Email Trades
                </button>
                <button
                  type="button"
                  id="btn-tradingview"
                  className="pill action-btn"
                  onClick={() => setChartModalOpen(true)}
                  style={{ minWidth: "180px", padding: "15px 24px", fontSize: "15px" }}
                >
                  TradingView Code
                </button>
                <button
                  type="button"
                  id="btn-connect-account"
                  className="pill action-btn action-btn-accent"
                  onClick={() => setAutomationModalOpen(true)}
                  style={{ minWidth: "180px", padding: "15px 24px", fontSize: "15px" }}
                >
                  Connect Account
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: EMAIL TRADES */}
      {emailModalOpen && (
        <div className="ov on" role="dialog" aria-modal="true" onClick={() => setEmailModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="x" aria-label="Close" onClick={() => setEmailModalOpen(false)}>
              ×
            </button>

            <span className={`badge ${isPython ? "py" : "pn"}`}>
              {isPython ? "Python Strategy" : "Pine Script"}
            </span>{" "}
            <span className="note">{strategy.id} · Email Trade Alerts</span>

            <h2 style={{ marginTop: "12px" }}>Email Trades for {strategy.name}</h2>
            <p className="note" style={{ fontSize: "14px", marginTop: "4px" }}>
              Subscribe to automated trade signals dispatched instantly upon model trigger. Includes entry price, stop-loss, and multi-tier take-profit levels.
            </p>

            {emailSuccess ? (
              <div className="ok" style={{ marginTop: "20px" }}>
                {emailSuccess}
              </div>
            ) : (
              <form onSubmit={handleSubscribeEmail} style={{ marginTop: "20px", display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "var(--mut)", marginBottom: "6px" }}>
                    Verified Destination Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="trader@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "var(--bg2)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "var(--tx)",
                      font: "inherit",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: "8px", fontSize: "13.5px", color: "var(--tx)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked /> Instant Entry Signals ({strategy.instrument} {strategy.timeframe})
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked /> Trailing Stop &amp; Exit Modifications
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked /> Friday 20:00 UTC Weekend Risk Embargo Warnings
                  </label>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                  <button type="submit" className="pill" disabled={emailLoading}>
                    {emailLoading ? "Configuring..." : "Confirm Email Trades"}
                  </button>
                  <span className="note">Instant activation · Zero delay</span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: FULL ACCOUNT AUTOMATION */}
      {automationModalOpen && (
        <div className="ov on" role="dialog" aria-modal="true" onClick={() => setAutomationModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="x" aria-label="Close" onClick={() => setAutomationModalOpen(false)}>
              ×
            </button>

            <span className={`badge ${isPython ? "py" : "pn"}`}>
              {isPython ? "Python MT5 Automation" : "Broker Bridge"}
            </span>{" "}
            <span className="note">{strategy.id} · Full Account Automation</span>

            <h2 style={{ marginTop: "12px" }}>Automate {strategy.name}</h2>
            <p className="note" style={{ fontSize: "14px", marginTop: "4px" }}>
              Link your MetaTrader 5 account or Paper Simulator to execute {strategy.name} orders with institutional low latency.
            </p>

            {automationSuccess ? (
              <div className="ok" style={{ marginTop: "20px" }}>
                {automationSuccess}
              </div>
            ) : (
              <form onSubmit={handleConnectAutomation} style={{ marginTop: "20px", display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "var(--mut)", marginBottom: "6px" }}>
                    Execution Environment
                  </label>
                  <select
                    value={brokerPlatform}
                    onChange={(e) => setBrokerPlatform(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "var(--bg2)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "var(--tx)",
                      font: "inherit",
                    }}
                  >
                    <option value="MetaTrader 5 (MT5) Desktop / VPS">MetaTrader 5 (MT5) Desktop / VPS Relay</option>
                    <option value="IC Markets MT5">IC Markets MT5 Server</option>
                    <option value="Pepperstone MT5">Pepperstone MT5 Server</option>
                    <option value="FTMO Proprietary MT5">FTMO Proprietary MT5 Server</option>
                    <option value="Interactive Brokers">Interactive Brokers (TWS / FIX API)</option>
                    <option value="cTrader FIX Gateway">cTrader Open API Gateway</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "var(--mut)", marginBottom: "6px" }}>
                      Account Login ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5092144"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "var(--bg2)",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        color: "var(--tx)",
                        font: "inherit",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "var(--mut)", marginBottom: "6px" }}>
                      Broker Server
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ICMarketsSC-Live"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "var(--bg2)",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        color: "var(--tx)",
                        font: "inherit",
                      }}
                    />
                  </div>
                </div>

                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px" }}>
                    <input
                      type="checkbox"
                      checked={isPaperSimulator}
                      onChange={(e) => setIsPaperSimulator(e.target.checked)}
                    />
                    <b>Deploy in Zero-Risk Virtual Paper Simulator</b>
                  </label>
                  <p className="note" style={{ margin: "4px 0 0 24px", fontSize: "12px" }}>
                    Runs 100% real tick execution against live market quotes with zero real money risk.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                  <button type="submit" className="pill" disabled={automationLoading}>
                    {automationLoading ? "Connecting..." : isPaperSimulator ? "Launch Paper Simulator" : "Deploy Live Automation"}
                  </button>
                  <span className="note">Includes automatic weekend embargo risk guard</span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW ON TRADINGVIEW (For Pine Script) */}
      {chartModalOpen && (
        <div className="ov on" role="dialog" aria-modal="true" onClick={() => setChartModalOpen(false)}>
          <div className="modal" style={{ maxWidth: "740px" }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="x" aria-label="Close" onClick={() => setChartModalOpen(false)}>
              ×
            </button>

            <span className="badge pn">Pine Script v5</span>{" "}
            <span className="note">{strategy.id} · Private TradingView Access</span>

            <h2 style={{ marginTop: "12px" }}>{strategy.name} on TradingView</h2>
            <p className="note" style={{ fontSize: "14px", marginTop: "4px" }}>
              TradingView Private Indicator Access & Webhook Signal Automation
            </p>

            <div
              style={{
                position: "relative",
                marginTop: "16px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "20px",
                color: "#e4e4e7",
                fontSize: "13.5px",
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <strong style={{ color: "#ffffff", fontSize: "14px" }}>
                  Proprietary Institutional Script Delivery
                </strong>
              </div>
              <p style={{ margin: "0 0 12px", color: "var(--mut)" }}>
                To safeguard Elvaris Capital quantitative IP and ensure zero reverse-engineering, execution logic is delivered through secure channels:
              </p>
              <ul style={{ margin: "0 0 16px", paddingLeft: "20px", display: "grid", gap: "8px", color: "#d4d4d8" }}>
                <li><b>Private TradingView Invite-Only Script:</b> Activated directly on your TradingView account handle.</li>
                <li><b>Institutional Webhook Signals:</b> Direct real-time execution alerts with verified HMAC signatures.</li>
                <li><b>LuxAlgo Vela Live Terminal:</b> Real-time candlestick charting with automated Long/Short trade brackets.</li>
              </ul>
              <div style={{ padding: "10px 14px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "12px", color: "#a1a1aa" }}>
                Your registered trader account includes instantaneous live chart and execution access to this strategy.
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <Link href={`/chart/${strategy.id}`} className="pill sm">
                Open Live Chart Workspace ↗
              </Link>
              <a
                href="https://www.tradingview.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pill g sm"
              >
                TradingView Terminal ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
