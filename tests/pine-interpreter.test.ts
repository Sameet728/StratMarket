import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractPineMetadata, executePineScript, PineCandle } from "@/lib/pine/pine-interpreter";

function generateSyntheticGoldCandles(count = 300): PineCandle[] {
  const candles: PineCandle[] = [];
  const start = Date.UTC(2026, 10, 20, 0, 0, 0); // 00:00 UTC
  let price = 3550;
  for (let i = 0; i < count; i++) {
    const wave = Math.sin(i / 6) * 18 + Math.cos(i / 13) * 12;
    const close = Number((price + wave).toFixed(2));
    const open = i === 0 ? close : candles[i - 1].close;
    const high = Number((Math.max(open, close) + 6.5).toFixed(2));
    const low = Number((Math.min(open, close) - 6.5).toFixed(2));
    candles.push({
      time: start + i * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume: 1200,
    });
  }
  return candles;
}

describe("Pine Script v5/v6 Interpreter & Auto-Metadata Parser", () => {
  it("parses and executes real repository PS-01.pine, PS-02.pine, and London_Keltner_STRATEGY.pine cleanly", () => {
    const candles = generateSyntheticGoldCandles(320);

    const ps01Code = fs.readFileSync(path.join(process.cwd(), "private-scripts", "PS-01.pine"), "utf-8");
    const m1 = extractPineMetadata(ps01Code);
    expect(m1.parseValid).toBe(true);
    expect(m1.detectedInstrument).toBe("XAUUSD");
    expect(m1.detectedTimeframe).toBe("M15");
    expect(m1.detectedIndicators).toContain("EMA");
    expect(m1.detectedIndicators).toContain("RSI");
    const r1 = executePineScript(ps01Code, candles, { instrument: "XAUUSD", timeframe: "M15" });
    expect(r1.success).toBe(true);
    expect(r1.plots.length).toBeGreaterThanOrEqual(4);

    const ps02Code = fs.readFileSync(path.join(process.cwd(), "private-scripts", "PS-02.pine"), "utf-8");
    const m2 = extractPineMetadata(ps02Code);
    expect(m2.parseValid).toBe(true);
    const r2 = executePineScript(ps02Code, candles, { instrument: "XAUUSD", timeframe: "M15" });
    expect(r2.success).toBe(true);

    const keltnerCode = fs.readFileSync(
      path.join(process.cwd(), "15M_Champion_Strategies", "Champion_15M_London_Keltner_STRATEGY.pine"),
      "utf-8"
    );
    const m3 = extractPineMetadata(keltnerCode);
    expect(m3.parseValid).toBe(true);
    expect(m3.detectedIndicators).toContain("Keltner");
    const r3 = executePineScript(keltnerCode, candles, { instrument: "XAUUSD", timeframe: "M15" });
    expect(r3.success).toBe(true);
  });

  it("executes arbitrary pasted Pine Script strategy with ta.crossover, strategy.entry, strategy.exit, and emits ENTRY/TP/SL events", () => {
    const customPine = `
//@version=5
strategy("Custom Crossover Test", overlay=true)
fast = ta.ema(close, 5)
slow = ta.ema(close, 15)
tp = input.float(8.0, "TP")
sl = input.float(6.0, "SL")

if ta.crossover(fast, slow) and strategy.position_size == 0
    strategy.entry("Long", strategy.long)
    strategy.exit("Exit Long", "Long", limit=close + tp, stop=close - sl)

if ta.crossunder(fast, slow) and strategy.position_size == 0
    strategy.entry("Short", strategy.short)
    strategy.exit("Exit Short", "Short", limit=close - tp, stop=close + sl)

plot(fast, "Fast EMA")
plot(slow, "Slow EMA")
`;
    const meta = extractPineMetadata(customPine);
    expect(meta.parseValid).toBe(true);
    expect(meta.detectedTitle).toBe("Custom Crossover Test");

    const candles = generateSyntheticGoldCandles(150);
    const res = executePineScript(customPine, candles, { instrument: "XAUUSD", timeframe: "M15" });
    expect(res.success).toBe(true);
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.events.some((e) => e.signalType === "ENTRY")).toBe(true);
    expect(res.events.some((e) => e.signalType === "TAKE_PROFIT" || e.signalType === "STOP_LOSS")).toBe(true);
    expect(res.plots.length).toBe(2);
  });
});
