import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("Marketplace Catalogue & Filtering", () => {
  it("loads exactly 4 champion Pine Script strategies in catalogue", async () => {
    const all = await db.getStrategies();
    expect(all.length).toBe(4);

    const ps = all.filter((s) => s.implementationType === "PINE_SCRIPT");
    expect(ps.length).toBe(4);
    expect(all.every((s) => s.implementationType === "PINE_SCRIPT")).toBe(true);
  });

  it("filters strategies by instrument, timeframe, and category", async () => {
    const gold = await db.getStrategies({ instrument: "XAUUSD" });
    expect(gold.every((s) => s.instrument === "XAUUSD")).toBe(true);

    const m15 = await db.getStrategies({ timeframe: "M15" });
    expect(m15.length).toBe(4);
    expect(m15.every((s) => s.timeframe === "M15")).toBe(true);

    const trend = await db.getStrategies({ category: "Trend" });
    expect(trend.every((s) => s.category === "Trend")).toBe(true);
  });

  it("searches strategies by name, ID, or asset", async () => {
    const searchById = await db.getStrategies({ query: "PS-01" });
    expect(searchById.length).toBeGreaterThan(0);
    expect(searchById[0].id).toBe("PS-01");

    const searchByName = await db.getStrategies({ query: "Apex" });
    expect(searchByName.length).toBe(1);
    expect(searchByName[0].name).toBe("Apex");

    const pineByType = await db.getStrategies({ type: "Pine Script" });
    expect(pineByType.length).toBe(4);
  });

  it("sorts strategies by profit factor and max drawdown", async () => {
    const sortedByPf = await db.getStrategies({ sort: "pf" });
    for (let i = 0; i < sortedByPf.length - 1; i++) {
      expect(sortedByPf[i].metrics.profitFactor).toBeGreaterThanOrEqual(
        sortedByPf[i + 1].metrics.profitFactor
      );
    }

    const sortedByDd = await db.getStrategies({ sort: "dd" });
    for (let i = 0; i < sortedByDd.length - 1; i++) {
      expect(sortedByDd[i].metrics.maxDrawdown).toBeLessThanOrEqual(
        sortedByDd[i + 1].metrics.maxDrawdown
      );
    }
  });

  it("sorts strategies by default: Pine Script number-wise (PS-01 to PS-04)", async () => {
    const list = await db.getStrategies();
    const ids = list.map((s) => s.id);
    expect(ids).toEqual([
      "PS-01",
      "PS-02",
      "PS-03",
      "PS-04",
    ]);
  });

  it("keeps private and draft strategies hidden from public listings", async () => {
    // Hide PS-03
    await db.updateStrategyStatus("PS-03", "PRIVATE");

    const publicList = await db.getStrategies({ includeDrafts: false });
    expect(publicList.find((s) => s.id === "PS-03")).toBeUndefined();

    // Restore status
    await db.updateStrategyStatus("PS-03", "PUBLIC");
    const restored = await db.getStrategies({ includeDrafts: false });
    expect(restored.find((s) => s.id === "PS-03")).toBeDefined();
  });

  it("resolves all 4 champion Pine Script strategies with tear sheets", async () => {
    for (let i = 1; i <= 4; i++) {
      const slug = `ps-${String(i).padStart(2, "0")}`;
      const strat = await db.getStrategyBySlug(slug);
      expect(strat).toBeDefined();
      expect(strat?.implementationType).toBe("PINE_SCRIPT");
      expect(strat?.timeframe).toBe("M15");
      expect(strat?.instrument).toBe("XAUUSD");
      expect(strat?.supportedUsageModes).toEqual(["chart", "alert", "broker"]);
    }
  });
});

