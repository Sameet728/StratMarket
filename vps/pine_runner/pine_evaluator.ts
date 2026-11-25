// Elvaris Capital — VPS Pine Script Real-Time Evaluator & Runner
// Evaluates Champion Pine Script strategies 24x7 using live TradingView market data

import fs from "fs";
import path from "path";
import { getCandles } from "@mathieuc/tradingview/data";
import { VpsSignalDispatcher, SignalPayload } from "../dispatcher";
import { executePineScript, PineCandle } from "./pine_interpreter";

export interface PineStrategyDefinition {
  id: string;
  slug: string;
  name: string;
  instrument: string;
  timeframe: string;
  version?: string;
  pineScriptCode?: string;
  bandLength: number;
  bandMult: number;
  emaMacroLen: number;
  emaFastLen: number;
  atrLen: number;
  offsetVal: number;
  crashFilterAtr: number;
  rsiLen: number;
  rsiLongThresh: number;
  rsiShortThresh: number;
  tpDist: number;
  slDist: number;
  sessionStart: number;
  sessionEnd: number;
  excludeHour12?: boolean;
  maxDailyLosses: number;
  maxDailyTrades: number;
}

export const PINE_STRATEGIES: PineStrategyDefinition[] = [
  {
    id: "PS-01",
    slug: "ps-01",
    name: "Grandmaster Dual 10R / 8R",
    instrument: "XAUUSD",
    timeframe: "15",
    bandLength: 28,
    bandMult: 2.1,
    emaMacroLen: 200,
    emaFastLen: 50,
    atrLen: 14,
    offsetVal: 4.0,
    crashFilterAtr: 1.25,
    rsiLen: 14,
    rsiLongThresh: 52,
    rsiShortThresh: 48,
    tpDist: 14.0,
    slDist: 13.75,
    sessionStart: 1,
    sessionEnd: 20,
    excludeHour12: true,
    maxDailyLosses: 1,
    maxDailyTrades: 2,
  },
  {
    id: "PS-02",
    slug: "ps-02",
    name: "US Afternoon Reversal",
    instrument: "XAUUSD",
    timeframe: "15",
    bandLength: 30,
    bandMult: 2.0,
    emaMacroLen: 200,
    emaFastLen: 50,
    atrLen: 14,
    offsetVal: 2.0,
    crashFilterAtr: 1.5,
    rsiLen: 14,
    rsiLongThresh: 52,
    rsiShortThresh: 48,
    tpDist: 18.0,
    slDist: 13.75,
    sessionStart: 14,
    sessionEnd: 22,
    excludeHour12: false,
    maxDailyLosses: 1,
    maxDailyTrades: 2,
  },
  {
    id: "PS-03",
    slug: "ps-03",
    name: "London Core Expansion",
    instrument: "XAUUSD",
    timeframe: "15",
    bandLength: 28,
    bandMult: 2.1,
    emaMacroLen: 200,
    emaFastLen: 50,
    atrLen: 14,
    offsetVal: 3.0,
    crashFilterAtr: 1.25,
    rsiLen: 14,
    rsiLongThresh: 52,
    rsiShortThresh: 48,
    tpDist: 16.0,
    slDist: 13.75,
    sessionStart: 4,
    sessionEnd: 20,
    excludeHour12: true,
    maxDailyLosses: 1,
    maxDailyTrades: 2,
  },
];

interface StrategyState {
  position: 0 | 1 | -1; // 0 = flat, 1 = long, -1 = short
  entryPrice: number;
  entryTime: number;
  currTP: number;
  currSL: number;
  lastProcessedBarTime: number;
  currentUtcDay: number;
  dayTradeCount: number;
  dayLossCount: number;
}

// Indicator math matching exact Pine Script v5 standards
function calculateSMA(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(NaN);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result[i] = sum / period;
  }
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(NaN);
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

function calculateRMA(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(NaN);
  if (data.length < period) return result;
  const alpha = 1 / period;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * alpha + result[i - 1] * (1 - alpha);
  }
  return result;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const tr = new Array(closes.length).fill(NaN);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }
  return calculateRMA(tr, period);
}

function calculateRSI(closes: number[], period: number = 14): number[] {
  const gains = new Array(closes.length).fill(0);
  const losses = new Array(closes.length).fill(0);
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains[i] = diff;
    else losses[i] = -diff;
  }
  const avgGains = calculateRMA(gains, period);
  const avgLosses = calculateRMA(losses, period);
  const rsi = new Array(closes.length).fill(NaN);
  for (let i = period; i < closes.length; i++) {
    if (avgLosses[i] === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGains[i] / avgLosses[i];
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }
  return rsi;
}

function calculateBollingerBands(closes: number[], period: number, mult: number) {
  const sma = calculateSMA(closes, period);
  const upper = new Array(closes.length).fill(NaN);
  const lower = new Array(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = closes[i - j] - sma[i];
      sumSquares += diff * diff;
    }
    const stdev = Math.sqrt(sumSquares / period);
    upper[i] = sma[i] + mult * stdev;
    lower[i] = sma[i] - mult * stdev;
  }
  return { sma, upper, lower };
}

export class PineStrategyRunner {
  private dispatcher: VpsSignalDispatcher;
  private states: Map<string, StrategyState> = new Map();
  private stateFilePath: string;
  private isRunning: boolean = false;
  private activeStrategies: PineStrategyDefinition[] = [...PINE_STRATEGIES];
  private lastSyncTime: number = 0;
  private syncIntervalMs: number = 60000;

  constructor(dispatcher: VpsSignalDispatcher) {
    this.dispatcher = dispatcher;
    this.stateFilePath = path.resolve(__dirname, "../data/pine_states.json");

    // Load persisted state if exists
    let savedStates: Record<string, StrategyState> = {};
    try {
      if (fs.existsSync(this.stateFilePath)) {
        savedStates = JSON.parse(fs.readFileSync(this.stateFilePath, "utf-8"));
      }
    } catch (_) {}

    for (const [id, st] of Object.entries(savedStates)) {
      this.states.set(id, st);
    }

    for (const strat of this.activeStrategies) {
      this.ensureState(strat.id);
    }
  }

  private ensureState(strategyId: string): StrategyState {
    let st = this.states.get(strategyId);
    if (!st) {
      st = {
        position: 0,
        entryPrice: 0,
        entryTime: 0,
        currTP: 0,
        currSL: 0,
        lastProcessedBarTime: 0,
        currentUtcDay: -1,
        dayTradeCount: 0,
        dayLossCount: 0,
      };
      this.states.set(strategyId, st);
    }
    return st;
  }

  /**
   * Synchronizes active PUBLIC Pine strategies from the marketplace DB every 60s.
   * Newly published strategies start running 24x7 automatically; private/deleted ones stop.
   */
  public async syncStrategiesFromServer(force: boolean = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.syncIntervalMs) {
      return;
    }
    this.lastSyncTime = now;

    const res = await this.dispatcher.fetchActivePineStrategies();
    if (!res.success || !Array.isArray(res.strategies)) {
      console.warn(`[VPS Pine] Strategy sync failed (${res.error || "unknown"}), keeping ${this.activeStrategies.length} cached strategies.`);
      return;
    }

    const prevIds = new Set(this.activeStrategies.map((s) => s.id));
    const nextStrategies: PineStrategyDefinition[] = res.strategies.map((s: any) => ({
      id: s.id,
      slug: s.slug || s.id.toLowerCase(),
      name: s.name,
      instrument: s.instrument || "XAUUSD",
      timeframe: String(s.timeframe || "15"),
      version: s.version || "1.0.0",
      pineScriptCode: s.pineScriptCode || undefined,
      bandLength: Number(s.bandLength ?? 28),
      bandMult: Number(s.bandMult ?? 2.1),
      emaMacroLen: Number(s.emaMacroLen ?? 200),
      emaFastLen: Number(s.emaFastLen ?? 50),
      atrLen: Number(s.atrLen ?? 14),
      offsetVal: Number(s.offsetVal ?? 4.0),
      crashFilterAtr: Number(s.crashFilterAtr ?? 1.25),
      rsiLen: Number(s.rsiLen ?? 14),
      rsiLongThresh: Number(s.rsiLongThresh ?? 52),
      rsiShortThresh: Number(s.rsiShortThresh ?? 48),
      tpDist: Number(s.tpDist ?? 14.0),
      slDist: Number(s.slDist ?? 13.75),
      sessionStart: Number(s.sessionStart ?? 1),
      sessionEnd: Number(s.sessionEnd ?? 20),
      excludeHour12: Boolean(s.excludeHour12 ?? false),
      maxDailyLosses: Number(s.maxDailyLosses ?? 1),
      maxDailyTrades: Number(s.maxDailyTrades ?? 2),
    }));

    const nextIds = new Set(nextStrategies.map((s) => s.id));
    const added = nextStrategies.filter((s) => !prevIds.has(s.id));
    const removed = this.activeStrategies.filter((s) => !nextIds.has(s.id));

    let stateChanged = false;
    for (const s of nextStrategies) {
      if (!this.states.has(s.id)) {
        this.ensureState(s.id);
        stateChanged = true;
      }
    }
    if (stateChanged) {
      this.saveState();
    }

    const prevJson = JSON.stringify(this.activeStrategies);
    const nextJson = JSON.stringify(nextStrategies);
    this.activeStrategies = nextStrategies;

    if (added.length > 0) {
      console.log(`[VPS Pine] + Auto-registered PUBLIC Pine strategies: ${added.map((s) => `${s.id} (${s.name})`).join(", ")}`);
    }
    if (removed.length > 0) {
      console.log(`[VPS Pine] - Deactivated PRIVATE/deleted Pine strategies: ${removed.map((s) => `${s.id} (${s.name})`).join(", ")}`);
    }
    if (added.length === 0 && removed.length === 0 && prevJson !== nextJson) {
      console.log(`[VPS Pine] ↻ Hot-reloaded updated parameters for active Pine strategies (${nextStrategies.map((s) => s.id).join(", ")}).`);
    }
  }

  private saveState(): void {
    try {
      const out: Record<string, StrategyState> = {};
      for (const [k, v] of this.states.entries()) {
        out[k] = v;
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify(out, null, 2), "utf-8");
    } catch (_) {}
  }

  /**
   * Evaluates a single Pine Script strategy against newly confirmed bars
   */
  public async evaluateStrategy(strat: PineStrategyDefinition): Promise<void> {
    const state = this.ensureState(strat.id);

    try {
      // 1. Fetch latest institutional market candles from TradingView
      let candles: any[] = [];
      try {
        const raw = await getCandles({
          symbol: `FOREXCOM:${strat.instrument}`,
          timeframe: strat.timeframe,
          count: 500,
        });
        if (raw && raw.length > 0) {
          candles = raw;
        }
      } catch (err: any) {
        // Fallback to OANDA if FOREXCOM encounters network delay
        try {
          const fallback = await getCandles({
            symbol: `OANDA:${strat.instrument}`,
            timeframe: strat.timeframe,
            count: 500,
          });
          if (fallback && fallback.length > 0) {
            candles = fallback;
          }
        } catch (_) {}
      }

      if (candles.length < 50) {
        return;
      }

      // 2. Identify the last confirmed closed bar (second to last element)
      const confirmedIdx = candles.length - 2;
      const confirmedBar = candles[confirmedIdx];
      const barTime = confirmedBar.time < 10000000000 ? confirmedBar.time * 1000 : confirmedBar.time;

      if (barTime <= state.lastProcessedBarTime) {
        // Bar has already been evaluated
        return;
      }

      // If this strategy has pasted Pine Script code from the Admin Panel, execute it via the Pine AST interpreter!
      if (strat.pineScriptCode && strat.pineScriptCode.trim()) {
        const prevBarTime = state.lastProcessedBarTime;
        const confirmedCandles: PineCandle[] = candles.slice(0, confirmedIdx + 1).map((c: any) => ({
          time: c.time < 10000000000 ? c.time * 1000 : c.time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume || 0),
        }));

        const res = executePineScript(strat.pineScriptCode, confirmedCandles, {
          instrument: strat.instrument,
          timeframe: strat.timeframe,
        });

        if (!res.success) {
          console.error(`[VPS Pine] Custom Pine script error for ${strat.id}:`, res.error);
          return;
        }

        state.lastProcessedBarTime = barTime;
        state.position = res.finalPosition.size > 0 ? 1 : res.finalPosition.size < 0 ? -1 : 0;
        state.entryPrice = res.finalPosition.entryPrice;
        state.entryTime = res.finalPosition.entryTime;
        state.currTP = res.finalPosition.currTP ?? 0;
        state.currSL = res.finalPosition.currSL ?? 0;

        // Determine newly triggered events on confirmed closed bars (never spam historical events on initial bootstrap)
        const isFirstBootstrap = prevBarTime === 0;
        const freshEvents = res.events.filter((ev) => {
          if (isFirstBootstrap) {
            // Only dispatch on initial attach if an event fired on the very latest confirmed bar within 20 minutes
            return ev.barTime === barTime && Date.now() - ev.barTime <= 20 * 60 * 1000;
          }
          return ev.barTime > prevBarTime && ev.barTime <= barTime;
        });

        for (const ev of freshEvents) {
          const dispatchRes = await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_${ev.signalType.toLowerCase()}_${ev.barTime}`,
            strategyId: strat.id,
            strategyVersion: strat.version || "1.0.0",
            instrument: strat.instrument,
            timeframe: strat.timeframe === "1D" ? "D1" : strat.timeframe === "60" ? "H1" : strat.timeframe === "240" ? "H4" : `M${strat.timeframe}`,
            signalType: ev.signalType,
            direction: ev.direction,
            timestamp: new Date(ev.barTime).toISOString(),
            entryPrice: ev.entryPrice,
            stopLoss: ev.stopLoss,
            targetPrice: ev.targetPrice,
            signalProvenance: "VPS_PINE_CUSTOM_SCRIPT_RUNNER",
          });
          console.log(`[VPS Pine] ⚡ Custom ${strat.id} (${strat.name}) ${ev.direction} ${ev.signalType} dispatched:`, dispatchRes);
        }

        this.saveState();
        return;
      }

      if (candles.length < 220) {
        return; // Need sufficient history for EMA 200 convergence on built-in PS-01..03
      }

      state.lastProcessedBarTime = barTime;

      // Reset daily Tradeify counters on UTC day transition
      const d = new Date(barTime);
      const utcDay = d.getUTCDate();
      if (state.currentUtcDay !== utcDay) {
        state.currentUtcDay = utcDay;
        state.dayTradeCount = 0;
        state.dayLossCount = 0;
      }

      // 3. Technical indicator series matching Pine Script exactly
      const closes = candles.map((c) => Number(c.close));
      const opens = candles.map((c) => Number(c.open));
      const highs = candles.map((c) => Number(c.high));
      const lows = candles.map((c) => Number(c.low));

      const cClose = closes[confirmedIdx];
      const cOpen = opens[confirmedIdx];
      const cHigh = highs[confirmedIdx];
      const cLow = lows[confirmedIdx];

      const emaMacroSeries = calculateEMA(closes, strat.emaMacroLen);
      const emaFastSeries = calculateEMA(closes, strat.emaFastLen);
      const atrSeries = calculateATR(highs, lows, closes, strat.atrLen);
      const rsiSeries = calculateRSI(closes, strat.rsiLen);
      const bands = calculateBollingerBands(closes, strat.bandLength, strat.bandMult);

      const emaMacro = emaMacroSeries[confirmedIdx];
      const emaFast = emaFastSeries[confirmedIdx];
      const atr = atrSeries[confirmedIdx];
      const rsiVal = rsiSeries[confirmedIdx];
      const upperBand = bands.upper[confirmedIdx];
      const lowerBand = bands.lower[confirmedIdx];

      // Session guard (UTC)
      const utcHour = d.getUTCHours();
      let inSession = utcHour >= strat.sessionStart && utcHour <= strat.sessionEnd;
      if (strat.excludeHour12 && utcHour === 12) {
        inSession = false;
      }

      // 4. Position Management: Evaluate Exits
      if (state.position === 1) {
        if (cHigh >= state.currTP) {
          // TAKE PROFIT
          await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_tp_${barTime}`,
            strategyId: strat.id,
            strategyVersion: "1.0.0",
            instrument: strat.instrument,
            timeframe: `M${strat.timeframe}`,
            signalType: "TAKE_PROFIT",
            direction: "LONG",
            timestamp: new Date(barTime).toISOString(),
            entryPrice: state.entryPrice,
            targetPrice: state.currTP,
            signalProvenance: "VPS_PINE_REALTIME_RUNNER",
          });
          console.log(`[VPS Pine] 🏆 ${strat.id} (${strat.name}) LONG TAKE_PROFIT triggered at ${state.currTP}`);
          state.position = 0;
          this.saveState();
        } else if (cLow <= state.currSL) {
          // STOP LOSS
          state.dayLossCount += 1;
          await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_sl_${barTime}`,
            strategyId: strat.id,
            strategyVersion: "1.0.0",
            instrument: strat.instrument,
            timeframe: `M${strat.timeframe}`,
            signalType: "STOP_LOSS",
            direction: "LONG",
            timestamp: new Date(barTime).toISOString(),
            entryPrice: state.entryPrice,
            stopLoss: state.currSL,
            signalProvenance: "VPS_PINE_REALTIME_RUNNER",
          });
          console.log(`[VPS Pine] ❌ ${strat.id} (${strat.name}) LONG STOP_LOSS triggered at ${state.currSL}`);
          state.position = 0;
          this.saveState();
        }
      } else if (state.position === -1) {
        if (cLow <= state.currTP) {
          // TAKE PROFIT
          await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_tp_${barTime}`,
            strategyId: strat.id,
            strategyVersion: "1.0.0",
            instrument: strat.instrument,
            timeframe: `M${strat.timeframe}`,
            signalType: "TAKE_PROFIT",
            direction: "SHORT",
            timestamp: new Date(barTime).toISOString(),
            entryPrice: state.entryPrice,
            targetPrice: state.currTP,
            signalProvenance: "VPS_PINE_REALTIME_RUNNER",
          });
          console.log(`[VPS Pine] 🏆 ${strat.id} (${strat.name}) SHORT TAKE_PROFIT triggered at ${state.currTP}`);
          state.position = 0;
          this.saveState();
        } else if (cHigh >= state.currSL) {
          // STOP LOSS
          state.dayLossCount += 1;
          await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_sl_${barTime}`,
            strategyId: strat.id,
            strategyVersion: "1.0.0",
            instrument: strat.instrument,
            timeframe: `M${strat.timeframe}`,
            signalType: "STOP_LOSS",
            direction: "SHORT",
            timestamp: new Date(barTime).toISOString(),
            entryPrice: state.entryPrice,
            stopLoss: state.currSL,
            signalProvenance: "VPS_PINE_REALTIME_RUNNER",
          });
          console.log(`[VPS Pine] ❌ ${strat.id} (${strat.name}) SHORT STOP_LOSS triggered at ${state.currSL}`);
          state.position = 0;
          this.saveState();
        }
      }

      // 5. Entry Signal Evaluation (Flat state only)
      const canTradeToday = state.dayLossCount < strat.maxDailyLosses && state.dayTradeCount < strat.maxDailyTrades;

      if (state.position === 0 && inSession && canTradeToday) {
        const crashFilterLong = cClose >= emaFast - strat.crashFilterAtr * atr;

        const isLong =
          crashFilterLong &&
          cClose > emaMacro + strat.offsetVal &&
          cLow <= lowerBand &&
          cClose > cOpen &&
          rsiVal < strat.rsiLongThresh;

        const isShort =
          cClose < emaMacro &&
          emaFast < emaMacro &&
          cHigh >= upperBand &&
          cClose < cOpen &&
          rsiVal > strat.rsiShortThresh;

        if (isLong) {
          state.position = 1;
          state.entryPrice = Number(cClose.toFixed(2));
          state.entryTime = barTime;
          state.currTP = Number((state.entryPrice + strat.tpDist).toFixed(2));
          state.currSL = Number((state.entryPrice - strat.slDist).toFixed(2));
          state.dayTradeCount += 1;

          const res = await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_entry_${barTime}`,
            strategyId: strat.id,
            strategyVersion: "1.0.0",
            instrument: strat.instrument,
            timeframe: `M${strat.timeframe}`,
            signalType: "ENTRY",
            direction: "LONG",
            timestamp: new Date(barTime).toISOString(),
            entryPrice: state.entryPrice,
            stopLoss: state.currSL,
            targetPrice: state.currTP,
            signalProvenance: "VPS_PINE_REALTIME_RUNNER",
          });
          console.log(`[VPS Pine] ⚡ ${strat.id} (${strat.name}) LONG ENTRY dispatched:`, res);
          this.saveState();
        } else if (isShort) {
          state.position = -1;
          state.entryPrice = Number(cClose.toFixed(2));
          state.entryTime = barTime;
          state.currTP = Number((state.entryPrice - strat.tpDist).toFixed(2));
          state.currSL = Number((state.entryPrice + strat.slDist).toFixed(2));
          state.dayTradeCount += 1;

          const res = await this.dispatcher.dispatchSignal({
            sourceEventId: `vps_pine_${strat.id.toLowerCase()}_entry_${barTime}`,
            strategyId: strat.id,
            strategyVersion: "1.0.0",
            instrument: strat.instrument,
            timeframe: `M${strat.timeframe}`,
            signalType: "ENTRY",
            direction: "SHORT",
            timestamp: new Date(barTime).toISOString(),
            entryPrice: state.entryPrice,
            stopLoss: state.currSL,
            targetPrice: state.currTP,
            signalProvenance: "VPS_PINE_REALTIME_RUNNER",
          });
          console.log(`[VPS Pine] ⚡ ${strat.id} (${strat.name}) SHORT ENTRY dispatched:`, res);
          this.saveState();
        }
      }
    } catch (err: any) {
      console.error(`[VPS Pine] Error evaluating ${strat.id}:`, err?.message || err);
    }
  }

  /**
   * Starts the 24x7 monitoring loop
   */
  public async start(intervalMs: number = 15000): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[VPS Pine] 24x7 Champion Pine Script Strategy Runner active.`);

    await this.syncStrategiesFromServer(true);
    console.log(`[VPS Pine] Active Strategies: ${this.activeStrategies.map((s) => `${s.id} (${s.name})`).join(", ") || "None"}`);

    const loop = async () => {
      if (!this.isRunning) return;
      await this.syncStrategiesFromServer(false);
      for (const strat of this.activeStrategies) {
        await this.evaluateStrategy(strat);
      }
      setTimeout(loop, intervalMs);
    };

    loop();
  }

  public stop(): void {
    this.isRunning = false;
    this.saveState();
    console.log("[VPS Pine] Pine Script Runner stopped.");
  }
}
