import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/session";

describe("7-Day Trial & Entitlement System", () => {
  let testUserId: string;

  beforeEach(async () => {
    const email = `trial_tester_${Date.now()}_${Math.random()}@elvariscapital.in`;
    const hash = await hashPassword("Password123!");
    const user = await db.createUser({
      name: "Trial Tester",
      email,
      passwordHash: hash,
    });
    testUserId = user.id;
  });

  it("atomically activates a 7-day trial with server-enforced duration", async () => {
    const beforeTime = Date.now();
    const result = await db.startTrial(testUserId, "ps-01");

    expect(result.trial.id).toBeDefined();
    expect(result.entitlement.id).toBeDefined();
    expect(result.trial.status).toBe("ACTIVE");
    expect(result.entitlement.status).toBe("ACTIVE");

    // Exactly 7 days (7 * 24 * 60 * 60 * 1000 = 604,800,000 ms)
    const durationMs = result.trial.expiryTime.getTime() - result.trial.startTime.getTime();
    expect(durationMs).toBe(7 * 24 * 60 * 60 * 1000);

    // Verify access check passes
    const access = await db.checkUserStrategyAccess(testUserId, "PS-01");
    expect(access.hasAccess).toBe(true);
    expect(access.accessType).toBe("TRIAL");
    expect(access.daysRemaining).toBe(7);
  });

  it("strictly prevents duplicate trials for the same user and strategy", async () => {
    await db.startTrial(testUserId, "ps-02");

    // Attempting second trial on PS-02 must be rejected
    await expect(db.startTrial(testUserId, "ps-02")).rejects.toThrow("TRIAL_ALREADY_USED");
  });

  it("denies access to non-entitled strategies", async () => {
    // User trialed PS-03 only
    await db.startTrial(testUserId, "ps-03");

    const accessPs03 = await db.checkUserStrategyAccess(testUserId, "PS-03");
    expect(accessPs03.hasAccess).toBe(true);

    const accessPs01 = await db.checkUserStrategyAccess(testUserId, "PS-01");
    expect(accessPs01.hasAccess).toBe(false);
    expect(accessPs01.accessType).toBe("NONE");
  });

  it("revokes access immediately when an entitlement expires", async () => {
    const result = await db.startTrial(testUserId, "ps-03");

    // Manually simulate expired time
    result.entitlement.expiryTime = new Date(Date.now() - 1000); // 1 second in the past

    const access = await db.checkUserStrategyAccess(testUserId, "PS-03");
    expect(access.hasAccess).toBe(false);
  });
});
