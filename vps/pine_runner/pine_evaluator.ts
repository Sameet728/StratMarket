// Elvaris Capital — VPS Pine Script Real-Time Evaluator & Runner
// Evaluates Champion Pine Script strategies 24x7 using live TradingView market data

import { getCandles } from "@mathieuc/tradingview/data";
import { VpsSignalDispatcher, SignalPayload } from "../dispatcher";

export interface PineStrategyDefinition {
  id: string;
  slug: string;
  name: string;
  instrument: string;
  timeframe: string;
  tpDist: number;
  slDist: number;
  sessionStart: number;
  sessionEnd: number;
  wickRatio: number;
}

export const PINE_STRATEGIES: PineStrategyDefinition[] = [
  {
    id: "PS-01",
    slug: "ps-01",
    name: "Grandmaster Dual 10R / 8R",
    instrument: "XAUUSD",
    timeframe: "15",
    tpDist: 18.0,
    slDist: 14.0,
    sessionStart: 6,
    sessionEnd: 20,
    wickRatio: 0.15,
  },
  {
    id: "PS-02",
    slug: "ps-02",
    name: "Apex 88% WR",
    instrument: "XAUUSD",
    timeframe: "15",
    tpDist: 17.0,
    slDist: 14.0,
    sessionStart: 6,
    sessionEnd: 20,
    wickRatio: 0.25,
  },
  {
    id: "PS-03",
    slug: "ps-03",
    name: "Strict 1:2 R:R",
    instrument: "XAUUSD",
    timeframe: "15",
    tpDist: 20.0,
    slDist: 10.0,
    sessionStart: 6,
    sessionEnd: 20,
    wickRatio: 0.10,
  },
  {
    id: "PS-04",
    slug: "ps-04",
    name: "Elite 80% WR",
    instrument: "XAUUSD",
    timeframe: "15",
    tpDist: 17.0,
    slDist: 14.0,
    sessionStart: 6,
    sessionEnd: 20,
    wickRatio: 0.20,
  },
];

interface StrategyState {
  position: 0 | 1 | -1; // 0 = flat, 1 = long, -1 = short
  entryPrice: number;
  entryTime: number;
  currTP: number;
  currSL: number;
  lastProcessedBarTime: number;
}

export class PineStrategyRunner {
  private dispatcher: VpsSignalDispatcher;
  private states: Map<string, StrategyState> = new Map();
  private isRunning: boolean = false;

  constructor(dispatcher: VpsSignalDispatcher) {
    this.dispatcher = dispatcher;
    for (const strat of PINE_STRATEGIES) {
      this.states.set(strat.id, {
        position: 0,
        entryPrice: 0,
        entryTime: 0,
        currTP: 0,
        currSL: 0,
        lastProcessedBarTime: 0,
      });
    }
  }

  /**
   * Evaluates a single Pine Script strategy against newly confirmed bars
   */
  public async evaluateStrategy(strat: PineStrategyDefinition): Promise<void> {
    const state = this.states.get(strat.id)!;

    try {
      // 1. Fetch latest institutional market candles from TradingView
      let candles: any[] = [];
      try {
        const raw = await getCandles({
          symbol: `FOREXCOM:${strat.instrument}`,
          timeframe: strat.timeframe,
          count: 220,
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
            count: 220,
          });
          if (fallback && fallback.length > 0) {
            candles = fallback;
          }
        } catch (_) {}
      }

      if (candles.length < 50) {
        return; // Insufficient data for safe causal evaluation
      }

      // 2. Identify the last confirmed closed bar (second to last element)
      const confirmedBar = candles[candles.length - 2];
      const barTime = confirmedBar.time < 10000000000 ? confirmedBar.time * 1000 : confirmedBar.time;

      if (barTime <= state.lastProcessedBarTime) {
        // Bar has already been evaluated
        return;
      }

      state.lastProcessedBarTime = barTime;

      // 3. Mathematical indicator calculations matching exact Pine Script
      const closes = candles.map((c) => Number(c.close));
      const opens = candles.map((c) => Number(c.open));
      const highs = candles.map((c) => Number(c.high));
      const lows = candles.map((c) => Number(c.low));

      const idx = candles.length - 2;
      const cClose = closes[idx];
      const cOpen = opens[idx];
      const cHigh = highs[idx];
      const cLow = lows[idx];

      // Session guard (UTC)
      const utcHour = new Date(barTime).getUTCHours();
      const inSession = utcHour >= strat.sessionStart && utcHour <= strat.sessionEnd;

      // Position Management: Check Exits
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
          console.log(`[VPS Pine] 🏆 ${strat.id} TAKE_PROFIT triggered at ${state.currTP}`);
          state.position = 0;
        } else if (cLow <= state.currSL) {
          // STOP LOSS
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
          console.log(`[VPS Pine] ❌ ${strat.id} STOP_LOSS triggered at ${state.currSL}`);
          state.position = 0;
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
          console.log(`[VPS Pine] 🏆 ${strat.id} TAKE_PROFIT triggered at ${state.currTP}`);
          state.position = 0;
        } else if (cHigh >= state.currSL) {
          // STOP LOSS
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
          console.log(`[VPS Pine] ❌ ${strat.id} STOP_LOSS triggered at ${state.currSL}`);
          state.position = 0;
        }
      }

      // Check Entry Signals (if flat)
      if (state.position === 0 && inSession) {
        const body = Math.abs(cClose - cOpen);
        const lowerWick = Math.min(cOpen, cClose) - cLow;
        const upperWick = cHigh - Math.max(cOpen, cClose);

        const isBullish = cClose > cOpen;
        const isBearish = cClose < cOpen;
        const wickLongOk = lowerWick >= body * strat.wickRatio;
        const wickShortOk = upperWick >= body * strat.wickRatio;

        // Long trigger condition
        if (isBullish && wickLongOk) {
          state.position = 1;
          state.entryPrice = Number(cClose.toFixed(2));
          state.entryTime = barTime;
          state.currTP = Number((state.entryPrice + strat.tpDist).toFixed(2));
          state.currSL = Number((state.entryPrice - strat.slDist).toFixed(2));

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
          console.log(`[VPS Pine] ⚡ ${strat.id} LONG ENTRY dispatched:`, res);
        } else if (isBearish && wickShortOk) {
          state.position = -1;
          state.entryPrice = Number(cClose.toFixed(2));
          state.entryTime = barTime;
          state.currTP = Number((state.entryPrice - strat.tpDist).toFixed(2));
          state.currSL = Number((state.entryPrice + strat.slDist).toFixed(2));

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
          console.log(`[VPS Pine] ⚡ ${strat.id} SHORT ENTRY dispatched:`, res);
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
    console.log(`[VPS Pine] 24x7 Pine Script Strategy Runner active. Monitoring ${PINE_STRATEGIES.length} strategies.`);

    const loop = async () => {
      if (!this.isRunning) return;
      for (const strat of PINE_STRATEGIES) {
        await this.evaluateStrategy(strat);
      }
      setTimeout(loop, intervalMs);
    };

    loop();
  }

  public stop(): void {
    this.isRunning = false;
    console.log("[VPS Pine] Pine Script Runner stopped.");
  }
}
