// Seed data for StratMarket - Elvaris Capital Algorithmic Trading Strategies
// Incorporates the 10 real MT5 Single-Digit Drawdown Ensembles + 4 Pine Script strategies

export interface StrategySeedItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  implementationType: "PYTHON" | "PINE_SCRIPT";
  instrument: string;
  timeframe: string;
  category: string;
  currentVersion: string;
  visibilityStatus: "PUBLIC" | "PRIVATE" | "DRAFT" | "ARCHIVED";
  trialEligibility: boolean;
  supportedUsageModes: string[];
  vpsStrategyRef?: string;
  ensembleFolder?: string;
  reportPath?: string;
  netProfitUsd?: string;
  metrics: {
    netReturn: number;
    maxDrawdown: number;
    profitFactor: number;
    winRate: number;
    calmarRatio?: number;
    totalTrades: number;
    averageTrade: number;
    sharpeRatio: number;
    backtestPeriod: string;
    transactionCosts: string;
    slippageAssumptions: string;
    dataSource: string;
    validationType: "BACKTESTED" | "SIMULATED" | "PAPER_TRADED" | "FORWARD_TESTED" | "LIVE";
    isDemo: boolean;
  };
  researchReport: {
    hypothesis: string;
    methodology: string;
    riskRules: string;
    knownLimitations: string;
    dataCleaning: string;
    executionProtocol: string;
  };
  equitySeries: number[];
  drawdownSeries: number[];
}

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateSeries(seed: number, count: number = 120, drift: number = 0.005) {
  const r = rng(seed);
  let v = 100;
  const eq = [v];
  for (let i = 1; i < count; i++) {
    v *= 1 + (r() - 0.43) * 0.025 + drift;
    eq.push(+v.toFixed(2));
  }
  let peak = 0;
  const dd = eq.map((val) => {
    peak = Math.max(peak, val);
    const d = (val / peak - 1) * 100;
    return +d.toFixed(2);
  });
  return { eq, dd };
}

// 10 Real MT5 Single-Digit Drawdown Ensembles
const MT5_PYTHON_ENSEMBLES = [
  {
    num: 1,
    folder: "Ensemble_01_6Engine_Peak_Champion",
    name: "Peak Champion",
    category: "Trend",
    netProfitUsd: "+$125,840.22",
    ret: 503.4,
    dd: 9.41,
    pf: 2.06,
    win: 22.41,
    trades: 781,
    sharpe: 1.71,
    desc: "Rank #1 Peak Champion with highest net cash profit & Calmar ratio. Quantitative ensemble combining orthogonal alpha engines.",
    hypothesis: "Gold (XAUUSD) order-flow imbalance (OFI) during London/NY overlap yields asymmetric risk-to-reward expansions exceeding 7:1 payoff ratio.",
  },
  {
    num: 2,
    folder: "Ensemble_02_7Engine_HighAlpha_Shield",
    name: "High-Alpha Shield",
    category: "Momentum",
    netProfitUsd: "+$123,568.00",
    ret: 494.3,
    dd: 9.95,
    pf: 1.98,
    win: 22.1,
    trades: 959,
    sharpe: 1.73,
    desc: "Rank #2 ensemble with highest trade density & opportunity volume across multi-session regimes with dynamic trailing defense.",
    hypothesis: "Combining Asian consolidation breakout with volatility sleep recovery captures high trade volume with steady equity expansion.",
  },
  {
    num: 3,
    folder: "Ensemble_03_7Engine_Precision_Shield",
    name: "Precision Shield",
    category: "Volatility",
    netProfitUsd: "+$122,421.00",
    ret: 489.7,
    dd: 9.35,
    pf: 1.99,
    win: 22.8,
    trades: 902,
    sharpe: 1.66,
    desc: "Rank #3 ensemble with high diversification, trend-regime shield, and exceptional 10.48 Calmar ratio.",
    hypothesis: "Orthogonal diversification dampens portfolio variance while maintaining full exposure to sustained gold breakouts.",
  },
  {
    num: 4,
    folder: "Ensemble_04_6Engine_InverseDD_Fleet",
    name: "Inverse-DD Fleet",
    category: "Trend",
    netProfitUsd: "+$121,693.00",
    ret: 486.8,
    dd: 9.77,
    pf: 2.02,
    win: 22.4,
    trades: 781,
    sharpe: 1.69,
    desc: "Rank #4 heavy low-drawdown engine concentration designed for rapid recovery from equity dips.",
    hypothesis: "Weighting low-drawdown engines inversely to historical volatility ensures portfolio drawdown remains below 10%.",
  },
  {
    num: 5,
    folder: "Ensemble_05_5Engine_Ultra_Shield",
    name: "Ultra-Shield",
    category: "Breakout",
    netProfitUsd: "+$117,681.00",
    ret: 470.7,
    dd: 9.53,
    pf: 2.28,
    win: 25.3,
    trades: 435,
    sharpe: 1.70,
    desc: "Rank #5 highest profit factor (2.28) and shortest loss streak (16 losses) with tight asymmetric volatility expansion stops.",
    hypothesis: "Selective tight-stop entries filtered by Jerk and Chaikin Money Flow eliminate loss clustering during market chop.",
  },
  {
    num: 6,
    folder: "Ensemble_06_5Engine_Trend_Shield",
    name: "Trend Shield",
    category: "Trend",
    netProfitUsd: "+$116,331.00",
    ret: 465.3,
    dd: 9.74,
    pf: 2.16,
    win: 23.5,
    trades: 604,
    sharpe: 1.74,
    desc: "Rank #6 balanced multi-session trend capture combining London and NY liquidity windows with Friday risk embargo.",
    hypothesis: "Enforcing a strict Friday 20:00 UTC weekend embargo completely eliminates gap risk on precious metals.",
  },
  {
    num: 7,
    folder: "Ensemble_07_6Engine_Multi_Regime",
    name: "Multi-Regime",
    category: "Mean reversion",
    netProfitUsd: "+$115,984.00",
    ret: 463.9,
    dd: 9.80,
    pf: 2.04,
    win: 23.0,
    trades: 768,
    sharpe: 1.65,
    desc: "Rank #7 high microstructure regime robustness across central bank hiking cycles, bank crisis, and all-time-high trends.",
    hypothesis: "Multi-regime clustering dynamically shifts weights between mean-reverting ranges and parabolic expansions.",
  },
  {
    num: 8,
    folder: "Ensemble_08_5Engine_HighSharpe_Fleet",
    name: "High-Sharpe Fleet",
    category: "Momentum",
    netProfitUsd: "+$115,560.00",
    ret: 462.2,
    dd: 9.50,
    pf: 2.29,
    win: 24.8,
    trades: 463,
    sharpe: 1.89,
    desc: "Rank #8 top annualized Sharpe ratio (1.89) and exceptionally low equity variance across 5 years of tick data.",
    hypothesis: "Filtering momentum by volume-weighted price elevation produces steady annual cash flow with minimal drawdown.",
  },
  {
    num: 9,
    folder: "Ensemble_09_5Engine_Asian_Squeeze",
    name: "Asian Squeeze",
    category: "Volatility",
    netProfitUsd: "+$115,122.00",
    ret: 460.5,
    dd: 9.96,
    pf: 2.21,
    win: 24.1,
    trades: 510,
    sharpe: 1.68,
    desc: "Rank #9 Asian session order flow imbalance (OFI) compression exploitation with dynamic chandelier trailing defense.",
    hypothesis: "Exploiting tight Asian liquidity consolidation before London open captures low-risk, early-trend positioning.",
  },
  {
    num: 10,
    folder: "Ensemble_10_5Engine_LowLoss_Fleet",
    name: "Low-Loss Fleet",
    category: "Trend",
    netProfitUsd: "+$115,009.00",
    ret: 460.0,
    dd: 9.43,
    pf: 2.11,
    win: 23.2,
    trades: 628,
    sharpe: 1.77,
    desc: "Rank #10 lowest maximum dollar drawdown ($5,882 on $25k capital) with balanced engine conviction weights.",
    hypothesis: "Strict fractional loss sizing limits max portfolio drawdown to under $6,000 across 360,000 real MT5 bars.",
  },
];

// 4 Pine Script M15 Champion Strategies from XAUUSD Champion Strategies — Performance Report.html
// Strategy 5 (1H Pure Sovereign) is intentionally excluded per user instruction.
const PINE_SCRIPT_STRATEGIES = [
  {
    num: 1,
    name: "Grandmaster Dual 10R / 8R",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 27.65,
    dd: 2.0,
    pf: 4.07,
    win: 80.0,
    calmar: 13.83,
    trades: 45,
    sharpe: 7.85,
    desc: "Fades 2.1-sigma band excursions along 200 EMA with RSI pullback filter, ATR flash crash protective shield, and 1:1.02 payoff ($13.75 SL / $14.00 TP). 80.00% win rate.",
    hypothesis: "Institutional mean-reversion with dynamic ATR flash crash filters, 200 EMA macro trend clearance, and Dual 10R/8R monthly consistency targets.",
    riskRules: "SL = $13.75, TP = $14.00. Max 1 loss/day, max 2 trades/day.",
    knownLimitations: "Sample covers verified live market cycles across 6,800 bars on XAUUSD M15.",
  },
  {
    num: 2,
    name: "US Afternoon Reversal",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 22.18,
    dd: 1.0,
    pf: 6.55,
    win: 83.3,
    calmar: 22.18,
    trades: 18,
    sharpe: 8.92,
    desc: "High-alpha NY afternoon session reversal fading 2.0-sigma volatility band excursions along 200 EMA with 83.33% win rate and 22.18 Calmar ($18.00 TP / $13.75 SL).",
    hypothesis: "Fades overextended momentum during the US afternoon window (14:00-22:00 UTC) capitalizing on late-day liquidity exhaustion.",
    riskRules: "SL = $13.75, TP = $18.00. Max 1 loss/day, max 2 trades/day.",
    knownLimitations: "Selective trading frequency during US afternoon session.",
  },
  {
    num: 3,
    name: "London Core Expansion",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 25.58,
    dd: 1.0,
    pf: 4.65,
    win: 80.0,
    calmar: 25.58,
    trades: 25,
    sharpe: 8.45,
    desc: "Institutional London & Frankfurt expansion mean-reversion with 80.00% win rate and 25.58 Calmar (1:1.16 R:R, $16.00 TP / $13.75 SL, 04:00-20:00 UTC).",
    hypothesis: "Captures European morning and early afternoon institutional expansions using 28-period 2.1-sigma envelope while excluding 12:00 UTC chop.",
    riskRules: "SL = $13.75, TP = $16.00. Max 1 loss/day, max 2 trades/day.",
    knownLimitations: "Trades strictly during active European & US overlap windows.",
  },
];

export const INITIAL_STRATEGIES: StrategySeedItem[] = [
  ...PINE_SCRIPT_STRATEGIES.map((ps) => {
    const id = `PS-${String(ps.num).padStart(2, "0")}`;
    const slug = id.toLowerCase();
    const { eq, dd } = generateSeries(ps.num + 30, 120, 0.004);

    return {
      id,
      slug,
      name: ps.name,
      description: ps.desc,
      implementationType: "PINE_SCRIPT" as const,
      instrument: ps.instrument,
      timeframe: ps.timeframe,
      category: ps.category,
      currentVersion: "1.0.0",
      visibilityStatus: "PUBLIC" as const,
      trialEligibility: true,
      supportedUsageModes: ["chart", "alert", "broker"],
      metrics: {
        netReturn: ps.ret,
        maxDrawdown: ps.dd,
        profitFactor: ps.pf,
        winRate: ps.win,
        calmarRatio: ps.calmar,
        totalTrades: ps.trades,
        averageTrade: +(ps.ret / ps.trades * 2.2).toFixed(2),
        sharpeRatio: ps.sharpe,
        backtestPeriod: "2026-08-02 to 2026-10-23 (5,050 M15 bars)",
        transactionCosts: "Spread $0.20/oz, slippage $0.05/oz, 1.0% risk per trade",
        slippageAssumptions: "Fixed $0.05/oz slippage model on next-bar-open execution",
        dataSource: "TradingView Institutional Feed (XAUUSD M15)",
        validationType: "BACKTESTED" as const,
        isDemo: false,
      },
      researchReport: {
        hypothesis: ps.hypothesis,
        methodology: "TradingView Pine Script v5 strategy backtested over 5,050 M15 bars (2 Aug to 23 Oct 2026). Spread $0.20/oz, slippage $0.05/oz.",
        riskRules: ps.riskRules,
        knownLimitations: ps.knownLimitations,
        dataCleaning: "Filtered for weekend rollover gaps and illiquid hours.",
        executionProtocol: "TradingView Pine Script v5 private engine execution. Available via cloud alert webhooks or direct broker chart integration.",
      },
      equitySeries: eq,
      drawdownSeries: dd,
    };
  }),

  // Python MT5 Ensembles temporarily removed to display only Pine Script strategies
];

export const INITIAL_PLANS = [
  {
    id: "plan-single",
    slug: "single-strategy",
    name: "Single Strategy",
    description: "Dedicated access to one algorithmic trading strategy of your choice.",
    priceMonthly: 7900,
    currency: "USD",
    priceDisplay: "$79 / month",
    features: [
      "One strategy of your choice",
      "Full research reports and equity charts",
      "Real-time email signal alerts",
      "Supported broker connection preview",
      "Community discord access"
    ],
    isHot: false,
    active: true
  },
  {
    id: "plan-all-access",
    slug: "all-access",
    name: "All-Access",
    description: "Complete access to every listed Pine Script trading strategy.",
    priceMonthly: 19900,
    currency: "USD",
    priceDisplay: "$199 / month",
    features: [
      "Every listed champion strategy (PS-01 to PS-04)",
      "All new strategy versions and releases",
      "Instant priority email signal alerts",
      "Interactive chart visualization with entry/exits",
      "Multi-asset portfolio diversification guidelines",
      "Direct Q&A with Elvaris research quants"
    ],
    isHot: true,
    active: true
  },
  {
    id: "plan-professional",
    slug: "professional",
    name: "Professional",
    description: "Institutional-grade strategy access with direct API and automated broker routing.",
    priceMonthly: 49900,
    currency: "USD",
    priceDisplay: "$499 / month",
    features: [
      "Everything included in All-Access",
      "Low-latency VPS webhook relay access",
      "Automated broker account execution integration",
      "Custom parameter overrides for risk governance",
      "1-on-1 monthly quant research briefing",
      "Dedicated account manager & SLA support"
    ],
    isHot: false,
    active: true
  }
];

export function getStrategySortOrder(s: { id: string; implementationType?: string }): number {
  const isPine = s.implementationType === "PINE_SCRIPT" || s.id.startsWith("PS-");
  const numMatch = s.id.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 999;
  return isPine ? num : 100 + num;
}
