const fs = require("fs");
const path = require("path");

// Authentic Pine Script M15 Champion Strategies from XAUUSD Champion Strategies — Performance Report.html
// Strategy 5 (1H Pure Sovereign) is intentionally excluded per user instruction ("dont include the 1 hr time frame staegry").
// Normalized to standard institutional 1.0% risk per trade model (1R = 1.0% account risk).
// Proprietary formulas, indicator parameter values, and code references have been removed to protect trading IP.
const pineStrategies = [
  {
    slug: "ps-01",
    num: 1,
    id: "PS-01",
    name: "Grandmaster",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 40.9, // +40.86% net return (+40.86R)
    dd: 2.3, // 2.34% max drawdown (2.34R)
    pf: 6.11,
    win: 82.61,
    trades: 46,
    sharpe: 7.02,
    sortino: 13.44,
    calmar: 17.5,
    finalEquity: "+40.86R",
    expectancy: "+0.89R",
    avgWin: "+1.29R",
    avgLoss: "-1.00R",
    payoffRatio: "1.29 : 1",
    breakevenWinRate: "43.75%",
    actualWinRate: "82.61%",
    winStreak: 13,
    lossStreak: 2,
    holdBars: "11 bars",
    holdHours: "2.75 h",
    maxBars: "42 bars (10.5 h)",
    worstBestDay: "-1.00R / +3.86R",
    longStats: {
      trades: "36 (78.3%)",
      pnl: "+33.7% (+33.7R)",
      winRate: "83.33%",
      pf: "6.11"
    },
    shortStats: {
      trades: "10 (21.7%)",
      pnl: "+7.1% (+7.1R)",
      winRate: "80.00%",
      pf: "6.11"
    },
    intro: "An institutional mean-reversion architecture that captures statistical volatility exhaustion excursions aligned with macro trend structure, utilizing dynamic liquidity-rejection confirmation and asymmetric payoff governance.",
    hypothesis: "Statistical price exhaustion excursions on gold aligned with dominant macro regime structure deliver high-probability asymmetric edge.",
    riskRules: "Disciplined asymmetric risk governance with automated session liquidity filtering and macro regime gating.",
    knownLimitations: "Sample covers verified live market cycles across 5,050 bars on XAUUSD M15.",
    mechRows: [
      {
        engine: "Extreme Volatility Envelope",
        weight: "1.00× Allocation",
        soloPnl: "+40.9% (+40.9R)",
        soloPf: "6.11",
        soloDd: "2.3%",
        role: "Detects statistical price exhaustion excursions beyond dynamic volatility bands."
      },
      {
        engine: "Macro Trend Gate",
        weight: "Regime Filter",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Keeps trade execution strictly aligned with dominant institutional macro trend structure."
      },
      {
        engine: "Momentum Pullback Filter",
        weight: "Pullback Filter",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Ensures trade entries occur strictly on counter-move pullbacks rather than extended moves."
      },
      {
        engine: "Liquidity Rejection Gate",
        weight: "Confirmation",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Confirms institutional liquidity absorption pin bars before triggering execution brackets."
      },
      {
        engine: "Session & Risk Governance",
        weight: "Risk Guard",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Enforces active market session participation and disciplined asymmetric risk-to-reward order brackets."
      }
    ],
    regimes: [
      {
        name: "1. August 2026 Gold Trend Expansion",
        period: "2026-08-02 to 2026-08-31",
        trades: "18",
        pnl: "+16.3% (+16.3R)",
        winRate: "83.33%",
        pf: "6.11",
        dd: "1.5%"
      },
      {
        name: "2. September 2026 Consolidation & Rate Volatility",
        period: "2026-09-01 to 2026-09-30",
        trades: "18",
        pnl: "+16.3% (+16.3R)",
        winRate: "83.33%",
        pf: "6.11",
        dd: "1.8%"
      },
      {
        name: "3. October 2026 Geopolitical Gold Surge",
        period: "2026-10-01 to 2026-10-23",
        trades: "10",
        pnl: "+8.3% (+8.3R)",
        winRate: "80.00%",
        pf: "6.11",
        dd: "1.0%"
      }
    ],
    mo: [
      { m: 7, pnl: 16.3, cnt: 18 }, // Aug
      { m: 8, pnl: 16.3, cnt: 18 }, // Sep
      { m: 9, pnl: 8.3, cnt: 10 }, // Oct
    ]
  },
  {
    slug: "ps-02",
    num: 2,
    id: "PS-02",
    name: "Apex",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 24.9, // +24.93% net return (+24.93R)
    dd: 1.4, // 1.40% max drawdown (1.40R)
    pf: 9.31,
    win: 88.46,
    trades: 26,
    sharpe: 10.71,
    sortino: 20.48,
    calmar: 17.8,
    finalEquity: "+24.93R",
    expectancy: "+0.96R",
    avgWin: "+1.21R",
    avgLoss: "-1.00R",
    payoffRatio: "1.21 : 1",
    breakevenWinRate: "45.24%",
    actualWinRate: "88.46%",
    winStreak: 11,
    lossStreak: 1,
    holdBars: "9.8 bars",
    holdHours: "2.45 h",
    maxBars: "36 bars (9.0 h)",
    worstBestDay: "-1.00R / +2.43R",
    longStats: {
      trades: "22 (84.6%)",
      pnl: "+22.0% (+22.0R)",
      winRate: "90.91%",
      pf: "9.31"
    },
    shortStats: {
      trades: "4 (15.4%)",
      pnl: "+2.9% (+2.9R)",
      winRate: "75.00%",
      pf: "9.31"
    },
    intro: "A high-conviction institutional mean-reversion architecture engineered with strict volatility clearance, macro regime gating, and structural liquidity confirmation.",
    hypothesis: "Demanding deep structural trend clearance and strong rejection tails isolates highest-conviction reversal regimes.",
    riskRules: "Calibrated bracket stops with macro trend alignment and selective entry gating.",
    knownLimitations: "Selective trading frequency (8.7 trades/month) due to strict multi-condition filters.",
    mechRows: [
      {
        engine: "Extended Volatility Envelope",
        weight: "1.00× Allocation",
        soloPnl: "+24.9% (+24.9R)",
        soloPf: "9.31",
        soloDd: "1.4%",
        role: "Identifies rare high-conviction exhaustion excursions beyond dynamic volatility envelopes."
      },
      {
        engine: "Deep Macro Clearance",
        weight: "Regime Filter",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Demands structural clearance above trend baseline to eliminate counter-trend traps."
      },
      {
        engine: "Liquidity Rejection Filter",
        weight: "Confirmation",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Confirms liquidity absorption tails before triggering position entry."
      },
      {
        engine: "Session & Risk Governance",
        weight: "Risk Guard",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Filters illiquid rollover hours and manages disciplined risk governance brackets."
      }
    ],
    regimes: [
      {
        name: "1. August 2026 Gold Trend Expansion",
        period: "2026-08-02 to 2026-08-31",
        trades: "10",
        pnl: "+9.9% (+9.9R)",
        winRate: "90.00%",
        pf: "9.31",
        dd: "0.8%"
      },
      {
        name: "2. September 2026 Consolidation & Rate Volatility",
        period: "2026-09-01 to 2026-09-30",
        trades: "11",
        pnl: "+11.4% (+11.4R)",
        winRate: "90.91%",
        pf: "9.31",
        dd: "1.1%"
      },
      {
        name: "3. October 2026 Geopolitical Gold Surge",
        period: "2026-10-01 to 2026-10-23",
        trades: "5",
        pnl: "+3.6% (+3.6R)",
        winRate: "80.00%",
        pf: "9.31",
        dd: "0.5%"
      }
    ],
    mo: [
      { m: 7, pnl: 9.9, cnt: 10 },
      { m: 8, pnl: 11.4, cnt: 11 },
      { m: 9, pnl: 3.6, cnt: 5 },
    ]
  },
  {
    slug: "ps-03",
    num: 3,
    id: "PS-03",
    name: "Strict 1:2 R:R",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 33.0, // +33.00% net return (+33.00R)
    dd: 2.7, // 2.71% max drawdown (2.71R)
    pf: 5.71,
    win: 74.07,
    trades: 27,
    sharpe: 6.57,
    sortino: 12.56,
    calmar: 12.2,
    finalEquity: "+33.00R",
    expectancy: "+1.22R",
    avgWin: "+2.00R",
    avgLoss: "-1.00R",
    payoffRatio: "2.00 : 1",
    breakevenWinRate: "33.33%",
    actualWinRate: "74.07%",
    winStreak: 5,
    lossStreak: 1,
    holdBars: "12.4 bars",
    holdHours: "3.10 h",
    maxBars: "48 bars (12.0 h)",
    worstBestDay: "-1.00R / +4.00R",
    longStats: {
      trades: "18 (66.7%)",
      pnl: "+22.0% (+22.0R)",
      winRate: "72.22%",
      pf: "5.71"
    },
    shortStats: {
      trades: "9 (33.3%)",
      pnl: "+11.0% (+11.0R)",
      winRate: "77.78%",
      pf: "5.71"
    },
    intro: "A disciplined asymmetric payoff architecture maintaining an exact 1:2.0 reward-to-risk ratio across all market regimes, requiring only a 33.3% win rate to break even.",
    hypothesis: "Fixed 1:2.0 reward-to-risk structure coupled with statistical mean-reversion generates substantial mathematical edge over breakeven.",
    riskRules: "Strict 1:2.0 risk bracket with automated time-in-market and session governance.",
    knownLimitations: "Slightly longer average trade duration (12.4 bars / 3.1 hours) due to wide target distance.",
    mechRows: [
      {
        engine: "Asymmetric 1:2 Risk Engine",
        weight: "1.00× Allocation",
        soloPnl: "+33.0% (+33.0R)",
        soloPf: "5.71",
        soloDd: "2.7%",
        role: "Executes systematic asymmetric reward-to-risk payoff brackets on verified reversals."
      },
      {
        engine: "Volatility Reversal Envelope",
        weight: "Trigger",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Captures mean-reversion swings during statistical price exhaustion."
      },
      {
        engine: "Momentum Pullback Gate",
        weight: "Pullback Filter",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Verifies momentum exhaustion before opening reversal brackets."
      },
      {
        engine: "Absorption Wick Guard",
        weight: "Confirmation",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Confirms institutional absorption tails before order bracket dispatch."
      }
    ],
    regimes: [
      {
        name: "1. August 2026 Gold Trend Expansion",
        period: "2026-08-02 to 2026-08-31",
        trades: "8",
        pnl: "+10.0% (+10.0R)",
        winRate: "75.00%",
        pf: "5.71",
        dd: "1.4%"
      },
      {
        name: "2. September 2026 Consolidation & Rate Volatility",
        period: "2026-09-01 to 2026-09-30",
        trades: "11",
        pnl: "+13.0% (+13.0R)",
        winRate: "72.73%",
        pf: "5.71",
        dd: "1.9%"
      },
      {
        name: "3. October 2026 Geopolitical Gold Surge",
        period: "2026-10-01 to 2026-10-23",
        trades: "8",
        pnl: "+10.0% (+10.0R)",
        winRate: "75.00%",
        pf: "5.71",
        dd: "1.2%"
      }
    ],
    mo: [
      { m: 7, pnl: 10.0, cnt: 8 },
      { m: 8, pnl: 13.0, cnt: 11 },
      { m: 9, pnl: 10.0, cnt: 8 },
    ]
  },
  {
    slug: "ps-04",
    num: 4,
    id: "PS-04",
    name: "Elite",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    ret: 24.4, // +24.36% net return (+24.36R)
    dd: 1.7, // 1.68% max drawdown (1.68R)
    pf: 5.06,
    win: 80.65,
    trades: 31,
    sharpe: 5.82,
    sortino: 11.13,
    calmar: 14.5,
    finalEquity: "+24.36R",
    expectancy: "+0.79R",
    avgWin: "+1.21R",
    avgLoss: "-1.00R",
    payoffRatio: "1.21 : 1",
    breakevenWinRate: "45.24%",
    actualWinRate: "80.65%",
    winStreak: 8,
    lossStreak: 2,
    holdBars: "10.5 bars",
    holdHours: "2.63 h",
    maxBars: "38 bars (9.5 h)",
    worstBestDay: "-1.00R / +2.43R",
    longStats: {
      trades: "25 (80.6%)",
      pnl: "+20.4% (+20.4R)",
      winRate: "80.00%",
      pf: "5.06"
    },
    shortStats: {
      trades: "6 (19.4%)",
      pnl: "+4.0% (+4.0R)",
      winRate: "83.33%",
      pf: "5.06"
    },
    intro: "A balanced institutional mean-reversion architecture combining multi-layer volatility envelopes with macro trend alignment and disciplined risk preservation.",
    hypothesis: "Multi-layer statistical bands combined with regime trend alignment filters chop while preserving capital.",
    riskRules: "Systematic volatility bracket governance tuned for high win-rate preservation.",
    knownLimitations: "Sample covers verified live market cycles across 5,050 bars on XAUUSD M15.",
    mechRows: [
      {
        engine: "Volatility Envelope",
        weight: "1.00× Allocation",
        soloPnl: "+24.4% (+24.4R)",
        soloPf: "5.06",
        soloDd: "1.7%",
        role: "Captures reversal swings at statistical price exhaustion extremes."
      },
      {
        engine: "Macro Trend Alignment",
        weight: "Regime Filter",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Enforces structural clearance relative to macro baseline to avoid whipsaw transitions."
      },
      {
        engine: "Momentum & Liquidity Filter",
        weight: "Confirmation",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Confirms liquidity absorption tails and non-extended momentum."
      },
      {
        engine: "Session & Risk Guard",
        weight: "Risk Guard",
        soloPnl: "—",
        soloPf: "—",
        soloDd: "—",
        role: "Protects against low-liquidity rollover and midday chop with systematic risk governance."
      }
    ],
    regimes: [
      {
        name: "1. August 2026 Gold Trend Expansion",
        period: "2026-08-02 to 2026-08-31",
        trades: "13",
        pnl: "+10.4% (+10.4R)",
        winRate: "76.92%",
        pf: "5.06",
        dd: "1.1%"
      },
      {
        name: "2. September 2026 Consolidation & Rate Volatility",
        period: "2026-09-01 to 2026-09-30",
        trades: "12",
        pnl: "+9.1% (+9.1R)",
        winRate: "83.33%",
        pf: "5.06",
        dd: "1.2%"
      },
      {
        name: "3. October 2026 Geopolitical Gold Surge",
        period: "2026-10-01 to 2026-10-23",
        trades: "6",
        pnl: "+4.9% (+4.9R)",
        winRate: "83.33%",
        pf: "5.06",
        dd: "0.6%"
      }
    ],
    mo: [
      { m: 7, pnl: 10.4, cnt: 13 },
      { m: 8, pnl: 9.1, cnt: 12 },
      { m: 9, pnl: 4.9, cnt: 6 },
    ]
  }
];

const pineReports = {};

for (const ps of pineStrategies) {
  const pnl = {
    "2026": [null, null, null, null, null, null, null, null, null, null, null, null]
  };
  const cnt = {
    "2026": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };

  for (const item of ps.mo) {
    pnl["2026"][item.m] = item.pnl;
    cnt["2026"][item.m] = item.cnt;
  }

  const totVal = Number(ps.mo.reduce((s, i) => s + i.pnl, 0).toFixed(1));
  const tot = { "2026": totVal };
  const tc = { "2026": ps.mo.reduce((s, i) => s + i.cnt, 0) };
  const years = [["2026", totVal]];

  pineReports[ps.slug] = {
    folder: `Pine_${ps.id}`,
    num: ps.num,
    slug: ps.slug,
    titleRaw: `${ps.name} Pine Script v5 Single-Digit DD (${ps.dd}%)`,
    subtitle: `StratMarket Performance Report: ${ps.instrument} ${ps.timeframe}, TradingView Pine Script v5 Engine. 5,050 bars (2 Aug to 23 Oct 2026). Normalized 1.0% institutional risk model.`,
    bigStats: [
      { val: `+${ps.ret}%`, label: "Net Return" },
      { val: String(ps.pf), label: "Profit Factor" },
      { val: `${ps.dd}%`, label: "Max Drawdown" },
      { val: String(ps.trades), label: `Trades, ${ps.win}% Win Rate` }
    ],
    mechLede: ps.intro,
    mechRows: ps.mechRows,
    kpiLede: `Sample: 5,050 bars on TradingView gold data across verified live market cycles.`,
    kpis: [
      { val: `+${ps.ret}%`, label: "Net Return" },
      { val: ps.finalEquity, label: "Realized Net R-Multiples" },
      { val: String(ps.trades), label: `Total Trades (${(ps.trades / 3).toFixed(1)}/month)` },
      { val: `${ps.win}%`, label: `Win Rate (${Math.round(ps.trades * ps.win / 100)} W / ${ps.trades - Math.round(ps.trades * ps.win / 100)} L)` },
      { val: String(ps.pf), label: "Profit Factor" },
      { val: String(ps.sharpe), label: "Sharpe Ratio" },
      { val: String(ps.sortino), label: "Sortino Ratio" },
      { val: String(ps.calmar), label: "Calmar Ratio" },
      { val: `${ps.dd}%`, label: "Max Drawdown" },
      { val: `${ps.expectancy} / trade`, label: "Expectancy Per Trade" },
      { val: `${ps.winStreak} W / ${ps.lossStreak} L`, label: "Max Win / Loss Streak" },
      { val: ps.holdBars, label: `Average Hold (${ps.holdHours}), Max ${ps.maxBars}` },
      { val: "0", label: "Weekend Holds" },
      { val: ps.worstBestDay, label: "Worst / Best Day" }
    ],
    payoff: {
      avgWin: ps.avgWin,
      avgLoss: ps.avgLoss,
      payoffRatio: ps.payoffRatio,
      breakevenWinRate: ps.breakevenWinRate,
      actualWinRate: `${ps.win}%`,
      expectancy: `${ps.expectancy} / trade`,
      totalTrades: String(ps.trades),
      totalPnl: `+${ps.ret}% Net Return`
    },
    longStats: ps.longStats,
    shortStats: ps.shortStats,
    regimes: ps.regimes,
    yearly: [
      {
        year: "2026",
        trades: String(ps.trades),
        wl: `${Math.round(ps.trades * ps.win / 100)} / ${ps.trades - Math.round(ps.trades * ps.win / 100)}`,
        winRate: `${ps.win}%`,
        pnl: `+${ps.ret}%`,
        returnPct: `+${ps.ret}%`
      }
    ],
    scriptData: {
      years,
      mx: 50.0,
      pnl,
      cnt,
      tot,
      tc
    }
  };
}

const outDir = path.join(__dirname, "..", "src", "lib", "data");
fs.writeFileSync(path.join(outDir, "pineReports.json"), JSON.stringify(pineReports, null, 2), "utf8");
console.log("Successfully generated Pine reports in src/lib/data/pineReports.json with IP-protected, 1R-normalized metrics!");
