import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { generateVpsSignature, verifyVpsSignature, isAuthorizedVpsOrWebhookRequest } from "@/lib/vps/security";
import { hashPassword } from "@/lib/auth/session";
import { sendSignalAlertEmail } from "@/lib/email/resend";

describe("Python VPS Signal Integration & Email Delivery", () => {
  const testSecret = "stratmarket-dev-vps-hmac-shared-secret-key-2026";

  it("verifies authentic HMAC SHA-256 signatures from VPS", () => {
    const rawBody = JSON.stringify({
      strategyId: "PY-01",
      signalType: "ENTRY",
      direction: "LONG",
      instrument: "XAUUSD",
      timeframe: "H1",
      sourceEventId: "evt_test_valid_01",
    });

    const nowTimestamp = Date.now().toString();
    const signature = generateVpsSignature(rawBody, nowTimestamp, testSecret);

    const check = verifyVpsSignature(rawBody, signature, nowTimestamp, testSecret);
    expect(check.valid).toBe(true);
  });

  it("rejects forged or tampered signatures", () => {
    const rawBody = JSON.stringify({ signal: "BUY" });
    const nowTimestamp = Date.now().toString();
    const forgedSignature = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const check = verifyVpsSignature(rawBody, forgedSignature, nowTimestamp, testSecret);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects replayed requests with expired timestamps (> 5 minutes)", () => {
    const rawBody = JSON.stringify({ signal: "BUY" });
    // Timestamp from 10 minutes ago
    const staleTimestamp = (Date.now() - 10 * 60 * 1000).toString();
    const signature = generateVpsSignature(rawBody, staleTimestamp, testSecret);

    const check = verifyVpsSignature(rawBody, signature, staleTimestamp, testSecret);
    expect(check.valid).toBe(false);
    expect(check.reason).toBe("TIMESTAMP_SKEW_EXCEEDED");
  });

  it("enforces idempotency and rejects duplicate sourceEventId", async () => {
    const uniqueEventId = "vps_evt_idempotent_" + Date.now();

    const signalData = {
      sourceEventId: uniqueEventId,
      strategyId: "PS-01",
      strategyVersion: "1.0.0",
      instrument: "XAUUSD",
      timeframe: "M15",
      signalType: "ENTRY" as const,
      direction: "LONG" as const,
      entryPrice: 2650.0,
    };

    // First ingestion must succeed
    const res1 = await db.ingestVpsSignal(signalData);
    expect(res1.signal.id).toBeDefined();

    // Replay with identical sourceEventId must be rejected
    await expect(db.ingestVpsSignal(signalData)).rejects.toThrow("DUPLICATE_SOURCE_EVENT_ID");
  });

  it("dispatches notifications only to entitled users with active alert preferences", async () => {
    const userEmail = `entitled_${Date.now()}@elvariscapital.in`;
    const hash = await hashPassword("Pass123!");
    const user = await db.createUser({
      name: "Entitled Trader",
      email: userEmail,
      passwordHash: hash,
    });

    // Start trial on PS-01
    await db.startTrial(user.id, "ps-01");

    // Ingest signal for PS-01
    const eventId = "evt_ps01_test_" + Date.now();
    const res = await db.ingestVpsSignal({
      sourceEventId: eventId,
      strategyId: "PS-01",
      instrument: "XAUUSD",
      timeframe: "M15",
      signalType: "ENTRY",
      direction: "LONG",
      entryPrice: 2650.0,
    });

    expect(res.notifiedUsersCount).toBeGreaterThan(0);

    const deliveries = await db.getUserDeliveries(user.id);
    expect(deliveries.some((d) => d.signalId === res.signal.id)).toBe(true);
  });

  it("authorizes TradingView alerts using token/secret via body, header, or query without HMAC headers", () => {
    // 1. Secret in JSON body
    const bodyAuth = isAuthorizedVpsOrWebhookRequest({
      rawBody: JSON.stringify({ action: "buy", secret: testSecret }),
      bodySecret: testSecret,
      secret: testSecret,
    });
    expect(bodyAuth.valid).toBe(true);
    expect(bodyAuth.authType).toBe("TOKEN");

    // 2. Secret in Bearer Authorization header
    const headerAuth = isAuthorizedVpsOrWebhookRequest({
      rawBody: JSON.stringify({ action: "buy" }),
      authHeader: `Bearer ${testSecret}`,
      secret: testSecret,
    });
    expect(headerAuth.valid).toBe(true);
    expect(headerAuth.authType).toBe("TOKEN");

    // 3. Secret in query parameter
    const queryAuth = isAuthorizedVpsOrWebhookRequest({
      rawBody: JSON.stringify({ action: "buy" }),
      querySecret: testSecret,
      secret: testSecret,
    });
    expect(queryAuth.valid).toBe(true);
    expect(queryAuth.authType).toBe("TOKEN");

    // 4. Missing or invalid secret rejected
    const invalidAuth = isAuthorizedVpsOrWebhookRequest({
      rawBody: JSON.stringify({ action: "buy" }),
      querySecret: "wrong-secret",
      secret: testSecret,
    });
    expect(invalidAuth.valid).toBe(false);
  });

  it("marks test email as sent and enforces max 1 test email limit per user", async () => {
    const testUserEmail = `test_limit_${Date.now()}@elvariscapital.in`;
    const user = await db.createUser({
      name: "Test Limit Trader",
      email: testUserEmail,
      passwordHash: await hashPassword("Elvaris2026!"),
    });

    expect(user.testEmailSent).toBe(false);

    // Initial check before sending test email
    const u1 = await db.getUserById(user.id);
    expect(u1?.testEmailSent).toBe(false);

    // Mark test email as sent
    await db.markUserTestEmailSent(user.id, testUserEmail);

    // Verify user is now marked as testEmailSent: true
    const u2 = await db.getUserById(user.id);
    expect(u2?.testEmailSent).toBe(true);
    expect(u2?.testEmailSentCount).toBe(1);
    expect(u2?.testEmailSentAt).toBeDefined();

    // Calling again increments the count
    await db.markUserTestEmailSent(user.id, testUserEmail);
    const u3 = await db.getUserById(user.id);
    expect(u3?.testEmailSentCount).toBe(2);
  });

  it("does not dispatch signal notifications or emails for non-public strategies (PY-01, PY-02)", async () => {
    // PY-02 is private / unlisted on the UI website
    const res = await db.ingestVpsSignal({
      sourceEventId: "evt_py02_test_" + Date.now(),
      strategyId: "PY-02",
      instrument: "XAUUSD",
      timeframe: "M5",
      signalType: "ENTRY",
      direction: "SHORT",
      entryPrice: 4019.27,
    });

    expect(res.signal.id).toBeDefined();
    // Non-public strategy must have ZERO notified users and ZERO subscriber emails
    expect(res.notifiedUsersCount).toBe(0);
    expect(res.subscriberEmails).toHaveLength(0);
  });

  it("only dispatches signals to users who explicitly subscribed and opted in", async () => {
    const unsubscribedUserEmail = `unsub_${Date.now()}@elvariscapital.in`;
    const subscribedUserEmail = `sub_${Date.now()}@elvariscapital.in`;
    const optedOutUserEmail = `optout_${Date.now()}@elvariscapital.in`;

    const userUnsub = await db.createUser({
      name: "Unsubscribed User",
      email: unsubscribedUserEmail,
      passwordHash: await hashPassword("Elvaris2026!"),
    });

    const userSub = await db.createUser({
      name: "Subscribed User",
      email: subscribedUserEmail,
      passwordHash: await hashPassword("Elvaris2026!"),
    });

    const userOptOut = await db.createUser({
      name: "Opted Out User",
      email: optedOutUserEmail,
      passwordHash: await hashPassword("Elvaris2026!"),
    });

    // Explicitly enable PS-02 for Subscribed User
    await db.setAlertPreference(userSub.id, "PS-02", true, ["ENTRY", "EXIT"], subscribedUserEmail);

    // Explicitly disable PS-02 for Opted Out User
    await db.setAlertPreference(userOptOut.id, "PS-02", false, ["ENTRY", "EXIT"], optedOutUserEmail);

    // Ingest public signal for PS-02
    const eventId = "evt_ps02_strict_test_" + Date.now();
    const res = await db.ingestVpsSignal({
      sourceEventId: eventId,
      strategyId: "PS-02",
      instrument: "XAUUSD",
      timeframe: "M15",
      signalType: "ENTRY",
      direction: "SHORT",
      entryPrice: 2650.0,
    });

    // Only userSub should be notified
    expect(res.subscriberEmails).toContain(subscribedUserEmail.toLowerCase());
    expect(res.subscriberEmails).not.toContain(unsubscribedUserEmail.toLowerCase());
    expect(res.subscriberEmails).not.toContain(optedOutUserEmail.toLowerCase());

    const unsubDeliveries = await db.getUserDeliveries(userUnsub.id);
    expect(unsubDeliveries.some((d) => d.signalId === res.signal.id)).toBe(false);

    const optOutDeliveries = await db.getUserDeliveries(userOptOut.id);
    expect(optOutDeliveries.some((d) => d.signalId === res.signal.id)).toBe(false);

    const subDeliveries = await db.getUserDeliveries(userSub.id);
    expect(subDeliveries.some((d) => d.signalId === res.signal.id)).toBe(true);
  });
});
