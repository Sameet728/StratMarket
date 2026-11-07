"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PlanItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  priceDisplay: string;
  features: string[];
  isHot: boolean;
}

export interface StrategyItem {
  id: string;
  slug: string;
  name: string;
  implementationType: "PINE_SCRIPT" | "PYTHON";
  instrument: string;
  timeframe: string;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  netReturn: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface Props {
  plans: PlanItem[];
  strategies: StrategyItem[];
  initialUser: UserProfile | null;
  initialPlanSlug?: string;
  initialStrategyId?: string;
}

export function PricingClient({
  plans,
  strategies,
  initialUser,
  initialPlanSlug,
  initialStrategyId,
}: Props) {
  const router = useRouter();

  // Billing Cycle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  // Selected Strategy for Single Strategy Plan
  const defaultStrategy =
    strategies.find(
      (s) =>
        s.id.toUpperCase() === (initialStrategyId || "").toUpperCase() ||
        s.slug.toLowerCase() === (initialStrategyId || "").toLowerCase()
    )?.id ||
    strategies[0]?.id ||
    "PS-01";

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(defaultStrategy);

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(Boolean(initialPlanSlug));
  const [activePlan, setActivePlan] = useState<PlanItem | null>(() => {
    if (initialPlanSlug) {
      return plans.find((p) => p.slug === initialPlanSlug) || plans[0] || null;
    }
    return null;
  });
  const [checkoutStrategyId, setCheckoutStrategyId] = useState<string>(defaultStrategy);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "RAZORPAY">("CARD");

  // Card Inputs
  const [cardholderName, setCardholderName] = useState<string>(initialUser?.name || "Quantitative Trader");
  const [cardNumber, setCardNumber] = useState<string>("•••• •••• •••• ••••");
  const [cardExpiry, setCardExpiry] = useState<string>("12/28");
  const [cardCvc, setCardCvc] = useState<string>("888");

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"PAYMENT" | "SUCCESS">("PAYMENT");

  const selectedStrategyObj = strategies.find((s) => s.id === selectedStrategyId) || strategies[0];
  const checkoutStrategyObj = strategies.find((s) => s.id === checkoutStrategyId) || strategies[0];

  // Helper to open checkout with plan and strategy
  const openCheckout = (plan: PlanItem, strategyId?: string) => {
    setActivePlan(plan);
    setCheckoutStrategyId(strategyId || selectedStrategyId);
    setCheckoutError(null);
    setCheckoutStep("PAYMENT");
    setCheckoutOpen(true);
  };

  // Helper to fill valid test card
  const handleQuickFillTestCard = () => {
    setCardholderName(user?.name || "Sameet Pisal");
    setCardNumber("4242 4242 4242 4242");
    setCardExpiry("10/29");
    setCardCvc("789");
  };

  // Inline Authentication Handler
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const endpoint = authMode === "LOGIN" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        authMode === "LOGIN"
          ? { email: authEmail, password: authPassword }
          : { name: authName || authEmail.split("@")[0], email: authEmail, password: authPassword };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Authentication failed. Please check credentials.");
        return;
      }

      setUser(data.user);
      setCardholderName(data.user.name);
    } catch {
      setAuthError("Network error during sign-in. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Direct Institutional Payment Execution
  const handleDirectPayment = async () => {
    if (!activePlan) return;
    if (!user) {
      setCheckoutError("Please sign in or create an account to finalize direct subscription.");
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: activePlan.slug,
          strategyId: activePlan.slug === "single-strategy" ? checkoutStrategyId : null,
          billingCycle,
          paymentMethod: paymentMethod === "CARD" ? "CARD" : "RAZORPAY",
          cardDetails: {
            cardNumber,
            cardExpiry,
            cardCvc,
            cardholderName,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCheckoutError(data.error || "Direct payment processing was rejected by the gateway.");
        return;
      }

      setOrderResult(data);
      setCheckoutStep("SUCCESS");
    } catch (err: any) {
      setCheckoutError("Connection error processing institutional transaction. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* 1. Header & Hero Section */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", color: "#d4af37", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          <span>⚡</span>
          <span>INSTITUTIONAL QUANTITATIVE SUITE · DIRECT STRATEGY CHECKOUT</span>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.03em", color: "#fff" }}>
          Institutional Subscriptions &amp; Access Passes
        </h1>

        <p style={{ maxWidth: 680, margin: "0 auto 28px", color: "var(--mut)", fontSize: 16, lineHeight: 1.6 }}>
          Deploy battle-tested quantitative algorithms developed by Elvaris Capital. Stream real-time TradingView candlestick charts, receive low-latency email signals, and automate MetaTrader 5 execution.
        </p>

        {/* Trust Badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#10b981" }}>✓</span> Instant Live Strategy Activation
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#10b981" }}>✓</span> 256-Bit Encrypted Direct Gateway
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#10b981" }}>✓</span> Real-Time 24/7 VPS Signal Feeds
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#10b981" }}>✓</span> Cancel or Switch Plans Anytime
          </span>
        </div>

        {/* Monthly / Annual Billing Toggle */}
        <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", borderRadius: 30, padding: 4 }}>
          <button
            onClick={() => setBillingCycle("monthly")}
            style={{
              padding: "7px 18px",
              borderRadius: 24,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              background: billingCycle === "monthly" ? "#ffffff" : "transparent",
              color: billingCycle === "monthly" ? "#000000" : "var(--mut)",
            }}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            style={{
              padding: "7px 18px",
              borderRadius: 24,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: billingCycle === "annual" ? "linear-gradient(135deg, #d4af37 0%, #b89728 100%)" : "transparent",
              color: billingCycle === "annual" ? "#000000" : "var(--mut)",
            }}
          >
            <span>Annual Billing</span>
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: billingCycle === "annual" ? "#000" : "rgba(212,175,55,0.2)", color: billingCycle === "annual" ? "#d4af37" : "#d4af37", fontWeight: 800 }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* 2. Three Subscription Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
          alignItems: "stretch",
          marginBottom: 48,
        }}
      >
        {/* CARD 1: SINGLE STRATEGY */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--line)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(10,10,12,0.95) 100%)",
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)", letterSpacing: "0.05em" }}>
                SPECIALIZED ALPHA
              </span>
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Single Strategy</h3>
            <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 18px", minHeight: 38 }}>
              Dedicated live execution, candlestick chart, and real-time email signal alerts for one strategy.
            </p>

            {/* Price Display */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                ${billingCycle === "annual" ? "63" : "79"}
              </span>
              <span style={{ color: "var(--mut)", fontSize: 13 }}>
                / month {billingCycle === "annual" && "(billed $756/yr)"}
              </span>
            </div>

            {/* Strategy Selector Dropdown */}
            <div style={{ padding: "14px", borderRadius: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                🎯 Choose Strategy to Unlock:
              </label>

              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  background: "#080c14",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <optgroup label="🌲 Pine Script v5 Strategies">
                  {strategies
                    .filter((s) => s.implementationType === "PINE_SCRIPT")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id}) · {s.instrument} {s.timeframe} (Win Rate {s.winRate}%)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🐍 Python MT5 Ensembles">
                  {strategies
                    .filter((s) => s.implementationType === "PYTHON")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id}) · {s.instrument} {s.timeframe} (PF {s.profitFactor})
                      </option>
                    ))}
                </optgroup>
              </select>

              {/* Live Metric Pills */}
              {selectedStrategyObj && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 11, flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700 }}>
                    Win Rate: {selectedStrategyObj.winRate}%
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#f8fafc", fontWeight: 700 }}>
                    PF: {selectedStrategyObj.profitFactor}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#f87171", fontWeight: 700 }}>
                    Max DD: {selectedStrategyObj.maxDrawdown}%
                  </span>
                </div>
              )}
            </div>

            {/* Feature Bullets */}
            <ul style={{ margin: "0 0 24px", padding: 0, listStyle: "none", display: "grid", gap: 10, fontSize: 13, color: "#cbd5e1" }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
                <span>Unrestricted live LuxAlgo Vela candlestick charting terminal</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
                <span>Real-time 24/7 email trade alerts (Entry, Exit, SL &amp; TP)</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
                <span>Zero-risk Virtual Paper Simulator execution</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
                <span>Full backtest tearsheet &amp; institutional research report</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              const plan = plans.find((p) => p.slug === "single-strategy") || plans[0];
              openCheckout(plan, selectedStrategyId);
            }}
            className="pill g"
            style={{
              width: "100%",
              padding: "13px 20px",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Direct Pay ${billingCycle === "annual" ? "63" : "79"} · Unlock {selectedStrategyId} →
          </button>
        </div>

        {/* CARD 2: ALL-ACCESS (MOST POPULAR) */}
        <div
          style={{
            borderRadius: 16,
            border: "2px solid #d4af37",
            background: "linear-gradient(180deg, rgba(212,175,55,0.06) 0%, rgba(10,12,16,0.98) 100%)",
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            boxShadow: "0 0 35px rgba(212,175,55,0.12)",
          }}
        >
          {/* Most Popular Ribbon */}
          <div
            style={{
              position: "absolute",
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
              color: "#000",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "0.08em",
              padding: "4px 16px",
              borderRadius: 20,
              textTransform: "uppercase",
            }}
          >
            ⭐ MOST POPULAR • ALL 14 STRATEGIES INCLUDED
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(212,175,55,0.18)", color: "#facc15", border: "1px solid rgba(212,175,55,0.4)", letterSpacing: "0.05em" }}>
                💎 COMPLETE QUANT SUITE
              </span>
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>All-Access Portfolio</h3>
            <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 18px", minHeight: 38 }}>
              Unconstrained access to every listed Pine Script and Python MT5 quantitative trading strategy.
            </p>

            {/* Price Display */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                ${billingCycle === "annual" ? "159" : "199"}
              </span>
              <span style={{ color: "var(--mut)", fontSize: 13 }}>
                / month {billingCycle === "annual" && "(billed $1,908/yr)"}
              </span>
            </div>

            {/* Strategy Inclusion Highlight Banner */}
            <div style={{ padding: "14px", borderRadius: 12, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fde047", marginBottom: 4 }}>
                ⚡ Unlocks All 14 Strategies Directly:
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
                • 4 Pine Script TradingView systems (PS-01 to PS-04)<br />
                • 10 MetaTrader 5 Ensembles (PY-01 to PY-10)<br />
                • Zero strategy lock-in — switch or combine at will
              </div>
            </div>

            {/* Feature Bullets */}
            <ul style={{ margin: "0 0 24px", padding: 0, listStyle: "none", display: "grid", gap: 10, fontSize: 13, color: "#cbd5e1" }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#d4af37", fontWeight: 800 }}>✓</span>
                <span><b>Every listed strategy</b> unlocked simultaneously</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#d4af37", fontWeight: 800 }}>✓</span>
                <span>Real-time priority 24/7 email signal alerts across all 14 feeds</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#d4af37", fontWeight: 800 }}>✓</span>
                <span>Unrestricted live candlestick charts with Long/Short execution overlays</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#d4af37", fontWeight: 800 }}>✓</span>
                <span>Multi-asset portfolio diversification and risk weighting matrix</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#d4af37", fontWeight: 800 }}>✓</span>
                <span>All future strategy releases and quant updates included</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              const plan = plans.find((p) => p.slug === "all-access") || plans[1] || plans[0];
              openCheckout(plan, undefined);
            }}
            className="pill"
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "center",
              background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
              color: "#000",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
              border: "none",
            }}
          >
            Direct Pay ${billingCycle === "annual" ? "159" : "199"} · Unlock All 14 Strategies →
          </button>
        </div>

        {/* CARD 3: PROFESSIONAL / INSTITUTIONAL */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--line)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(10,10,12,0.95) 100%)",
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "rgba(168, 85, 247, 0.12)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.25)", letterSpacing: "0.05em" }}>
                INSTITUTIONAL INFRASTRUCTURE
              </span>
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Professional</h3>
            <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 18px", minHeight: 38 }}>
              Ultra-low latency VPS execution relays, direct REST/FIX webhooks, and quant desk support.
            </p>

            {/* Price Display */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                ${billingCycle === "annual" ? "399" : "499"}
              </span>
              <span style={{ color: "var(--mut)", fontSize: 13 }}>
                / month {billingCycle === "annual" && "(billed $4,788/yr)"}
              </span>
            </div>

            {/* Institutional Tag */}
            <div style={{ padding: "14px", borderRadius: 12, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e9d5ff", marginBottom: 4 }}>
                🛡️ Direct Execution Relays:
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
                Sub-50ms dedicated VPS webhooks for automated broker execution and institutional risk governance.
              </div>
            </div>

            {/* Feature Bullets */}
            <ul style={{ margin: "0 0 24px", padding: 0, listStyle: "none", display: "grid", gap: 10, fontSize: 13, color: "#cbd5e1" }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#c084fc", fontWeight: 800 }}>✓</span>
                <span>Everything included in All-Access Portfolio</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#c084fc", fontWeight: 800 }}>✓</span>
                <span>Low-latency dedicated VPS webhook relay (&lt; 50ms)</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#c084fc", fontWeight: 800 }}>✓</span>
                <span>Custom parameter overrides for risk governance</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#c084fc", fontWeight: 800 }}>✓</span>
                <span>1-on-1 monthly quant research briefing</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#c084fc", fontWeight: 800 }}>✓</span>
                <span>Dedicated account manager &amp; priority SLA support</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              const plan = plans.find((p) => p.slug === "professional") || plans[2] || plans[0];
              openCheckout(plan, undefined);
            }}
            className="pill g"
            style={{
              width: "100%",
              padding: "13px 20px",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Direct Pay ${billingCycle === "annual" ? "399" : "499"} · Institutional Desk →
          </button>
        </div>
      </div>

      {/* 3. DIRECT PAYMENT CHECKOUT MODAL */}
      {checkoutOpen && activePlan && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(3, 5, 11, 0.88)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setCheckoutOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              background: "#0a0d17",
              border: "1px solid rgba(212,175,55,0.35)",
              borderRadius: 18,
              boxShadow: "0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(212,175,55,0.15)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(90deg, rgba(212,175,55,0.08) 0%, rgba(10,13,23,0.5) 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <div>
                  <h3 style={{ fontSize: 17, margin: 0, fontWeight: 800, color: "#fff" }}>
                    StratMarket Direct Institutional Checkout
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>
                    🔒 256-Bit SSL Encrypted Direct Transaction
                  </div>
                </div>
              </div>

              {!isProcessing && (
                <button
                  onClick={() => setCheckoutOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--line)",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--mut)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {checkoutStep === "SUCCESS" && orderResult ? (
                /* SUCCESS STATE */
                <div style={{ textAlign: "center", padding: "16px 8px" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "rgba(16,185,129,0.15)",
                      border: "2px solid #10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                      fontSize: 32,
                      boxShadow: "0 0 25px rgba(16,185,129,0.3)",
                    }}
                  >
                    ✓
                  </div>

                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                    Direct Payment Confirmed!
                  </h2>
                  <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 24px" }}>
                    {orderResult.message || "Your subscription has been provisioned and your strategy access is live immediately."}
                  </p>

                  {/* Order Receipt Details */}
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                      background: "rgba(0,0,0,0.35)",
                      padding: 16,
                      textAlign: "left",
                      marginBottom: 24,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "var(--mut)" }}>Order Reference:</span>
                      <code style={{ color: "#38bdf8", fontWeight: 700 }}>{orderResult.order?.id}</code>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "var(--mut)" }}>Plan / Tier:</span>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{activePlan.name}</span>
                    </div>
                    {activePlan.slug === "single-strategy" && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: "var(--mut)" }}>Unlocked Strategy:</span>
                        <span style={{ color: "#4ade80", fontWeight: 700 }}>{checkoutStrategyId}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "var(--mut)" }}>Amount Paid:</span>
                      <span style={{ color: "#fff", fontWeight: 700 }}>${orderResult.order?.amount} USD</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--mut)" }}>Email Alerts:</span>
                      <span style={{ color: "#10b981", fontWeight: 600 }}>Active for {user?.email}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    {activePlan.slug === "single-strategy" && checkoutStrategyId ? (
                      <Link
                        href={`/chart/${checkoutStrategyId.toLowerCase()}`}
                        className="pill"
                        style={{
                          fontSize: 14,
                          padding: "12px 24px",
                          textDecoration: "none",
                          background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
                          color: "#000",
                          fontWeight: 800,
                        }}
                      >
                        📈 Open {checkoutStrategyId} Live Chart Terminal →
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard"
                        className="pill"
                        style={{
                          fontSize: 14,
                          padding: "12px 24px",
                          textDecoration: "none",
                          background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
                          color: "#000",
                          fontWeight: 800,
                        }}
                      >
                        📊 Open Trader Dashboard →
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setCheckoutOpen(false);
                        router.refresh();
                      }}
                      className="pill g"
                      style={{ fontSize: 14, padding: "12px 20px" }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : !user ? (
                /* INLINE AUTHENTICATION REQUIRED */
                <div>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                      Sign In to Complete Subscription
                    </h4>
                    <p style={{ color: "var(--mut)", fontSize: 13, margin: 0 }}>
                      Authenticate to link your subscription and receive real-time signal alert feeds.
                    </p>
                  </div>

                  {/* Auth Tabs */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                      onClick={() => setAuthMode("LOGIN")}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: authMode === "LOGIN" ? "rgba(255,255,255,0.08)" : "transparent",
                        color: authMode === "LOGIN" ? "#fff" : "var(--mut)",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setAuthMode("REGISTER")}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: authMode === "REGISTER" ? "rgba(255,255,255,0.08)" : "transparent",
                        color: authMode === "REGISTER" ? "#fff" : "var(--mut)",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Create Account
                    </button>
                  </div>

                  <form onSubmit={handleInlineAuth} style={{ display: "grid", gap: 12 }}>
                    {authMode === "REGISTER" && (
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--mut)", marginBottom: 4 }}>Full Name</label>
                        <input
                          type="text"
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Sameet Pisal"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "rgba(0,0,0,0.3)",
                            color: "#fff",
                            fontSize: 13,
                            outline: "none",
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--mut)", marginBottom: 4 }}>Email Address</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="trader@elvariscapital.in"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: "rgba(0,0,0,0.3)",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--mut)", marginBottom: 4 }}>Password</label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: "rgba(0,0,0,0.3)",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                    </div>

                    {authError && (
                      <div style={{ color: "#ef4444", fontSize: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)" }}>
                        ✕ {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="pill"
                      style={{
                        padding: "12px",
                        fontSize: 14,
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
                        color: "#000",
                        marginTop: 4,
                      }}
                    >
                      {authLoading ? "Authenticating..." : authMode === "LOGIN" ? "Sign In & Proceed to Payment →" : "Register & Proceed to Payment →"}
                    </button>
                  </form>
                </div>
              ) : (
                /* DIRECT PAYMENT FORM */
                <div>
                  {/* Order Summary Box */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--line)",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#d4af37", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Selected Plan
                        </div>
                        <h4 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "2px 0 0" }}>
                          {activePlan.name}
                        </h4>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                          ${activePlan.slug === "single-strategy" ? (billingCycle === "annual" ? "63" : "79") : activePlan.slug === "all-access" ? (billingCycle === "annual" ? "159" : "199") : (billingCycle === "annual" ? "399" : "499")}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--mut)" }}>
                          / month {billingCycle === "annual" ? "(Annual Billing)" : "(Monthly)"}
                        </div>
                      </div>
                    </div>

                    {/* Single Strategy Switcher within Checkout */}
                    {activePlan.slug === "single-strategy" && (
                      <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                          TARGET STRATEGY:
                        </label>
                        <select
                          value={checkoutStrategyId}
                          onChange={(e) => setCheckoutStrategyId(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            background: "#080c14",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            outline: "none",
                          }}
                        >
                          <optgroup label="🌲 Pine Script v5">
                            {strategies
                              .filter((s) => s.implementationType === "PINE_SCRIPT")
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.id}) · {s.instrument} (Win Rate: {s.winRate}%)
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="🐍 Python MT5 Ensembles">
                            {strategies
                              .filter((s) => s.implementationType === "PYTHON")
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.id}) · {s.instrument} (PF: {s.profitFactor})
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </div>
                    )}

                    {activePlan.slug !== "single-strategy" && (
                      <div style={{ paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>✓</span>
                        <span>Directly unlocks all 14 quantitative strategies across Pine Script and MT5</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase" }}>
                        Payment Method
                      </label>
                      <button
                        onClick={handleQuickFillTestCard}
                        type="button"
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(212,175,55,0.12)",
                          border: "1px solid rgba(212,175,55,0.3)",
                          color: "#d4af37",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ⚡ Quick Fill Demo Card
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CARD")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 8,
                          border: paymentMethod === "CARD" ? "1px solid #d4af37" : "1px solid var(--line)",
                          background: paymentMethod === "CARD" ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)",
                          color: paymentMethod === "CARD" ? "#fff" : "var(--mut)",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>💳</span>
                        <span>Credit / Debit Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("RAZORPAY")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 8,
                          border: paymentMethod === "RAZORPAY" ? "1px solid #38bdf8" : "1px solid var(--line)",
                          background: paymentMethod === "RAZORPAY" ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.02)",
                          color: paymentMethod === "RAZORPAY" ? "#fff" : "var(--mut)",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <span>🏦</span>
                        <span>Razorpay / UPI</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Fields */}
                  <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Cardholder Name</label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="Name on card"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: "rgba(0,0,0,0.3)",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Card Number</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "rgba(0,0,0,0.3)",
                            color: "#fff",
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            outline: "none",
                          }}
                        />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
                          💳
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Expires (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "rgba(0,0,0,0.3)",
                            color: "#fff",
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>CVC / CVV</label>
                        <input
                          type="password"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="•••"
                          maxLength={4}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "rgba(0,0,0,0.3)",
                            color: "#fff",
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {checkoutError && (
                    <div style={{ color: "#ef4444", fontSize: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", marginBottom: 16 }}>
                      ✕ {checkoutError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleDirectPayment}
                    disabled={isProcessing}
                    className="pill"
                    style={{
                      width: "100%",
                      padding: "14px 20px",
                      fontSize: 15,
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #d4af37 0%, #b89728 100%)",
                      color: "#000",
                      boxShadow: "0 4px 20px rgba(212,175,55,0.25)",
                      cursor: isProcessing ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            border: "2px solid rgba(0,0,0,0.2)",
                            borderTopColor: "#000",
                            borderRadius: "50%",
                            animation: "spin 0.6s linear infinite",
                          }}
                        />
                        <span>Authorizing &amp; Provisioning Access...</span>
                      </>
                    ) : (
                      <>
                        <span>🔒</span>
                        <span>
                          Direct Pay ${activePlan.slug === "single-strategy" ? (billingCycle === "annual" ? "63" : "79") : activePlan.slug === "all-access" ? (billingCycle === "annual" ? "159" : "199") : (billingCycle === "annual" ? "399" : "499")}{" "}
                          &amp; Unlock {activePlan.slug === "single-strategy" ? checkoutStrategyId : "All Strategies"}
                        </span>
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: "center", fontSize: 11, color: "var(--mut)", marginTop: 12 }}>
                    Institutional subscription renews automatically. Cancel anytime directly in Profile settings.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
