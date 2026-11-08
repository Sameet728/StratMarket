import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, signToken, verifyToken } from "@/lib/auth/session";

describe("Authentication & Session Security", () => {
  it("hashes password and verifies correctly with bcrypt", async () => {
    const raw = "SuperSecret2026!";
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("signs and verifies JWT tokens with tamper detection", () => {
    const testUser = {
      id: "usr_test_123",
      email: "quant@elvariscapital.in",
      name: "Quant Researcher",
      role: "CUSTOMER" as const,
      accountStatus: "ACTIVE",
      emailVerified: true,
    };

    const token = signToken(testUser);
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe(testUser.email);
    expect(decoded?.role).toBe("CUSTOMER");

    // Tampered token test
    const tampered = token.slice(0, -6) + "abcdef";
    const invalidPayload = verifyToken(tampered);
    expect(invalidPayload).toBeNull();
  });

  it("prevents creating duplicate users with same email", async () => {
    const email = `test_${Date.now()}@elvariscapital.in`;
    const hash = await hashPassword("TestPass123!");

    const user1 = await db.createUser({
      name: "User One",
      email,
      passwordHash: hash,
    });
    expect(user1.id).toBeDefined();

    // Duplicate attempt must throw
    await expect(
      db.createUser({
        name: "User Two",
        email,
        passwordHash: hash,
      })
    ).rejects.toThrow("USER_EXISTS");
  });

  it("handles forgot password OTP generation, verification, and reset", async () => {
    const email = `reset_${Date.now()}@elvariscapital.in`;
    const initialHash = await hashPassword("InitialPass123!");

    await db.createUser({
      name: "Reset User",
      email,
      passwordHash: initialHash,
    });

    // 1. Generate OTP
    const { otp, expiresAt } = await db.createPasswordResetOtp(email);
    expect(otp).toBeDefined();
    expect(otp).toMatch(/^\d{6}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // 2. Reject incorrect OTP
    const wrongVerification = await db.verifyPasswordResetOtp(email, "000000");
    expect(wrongVerification.valid).toBe(false);
    expect(wrongVerification.error).toContain("Invalid verification code");

    // 3. Accept valid OTP
    const validVerification = await db.verifyPasswordResetOtp(email, otp);
    expect(validVerification.valid).toBe(true);

    // 4. Reset password with OTP
    const newPass = "NewSecurePass2026!";
    const newHash = await hashPassword(newPass);
    const resetResult = await db.resetPasswordWithOtp(email, otp, newHash);
    expect(resetResult.success).toBe(true);

    // 5. Verify user can now authenticate with new password
    const updatedUser = await db.getUserByEmail(email);
    expect(updatedUser).not.toBeNull();
    expect(await verifyPassword(newPass, updatedUser!.passwordHash)).toBe(true);
    expect(await verifyPassword("InitialPass123!", updatedUser!.passwordHash)).toBe(false);

    // 6. Verify consumed OTP cannot be reused
    const reuseAttempt = await db.verifyPasswordResetOtp(email, otp);
    expect(reuseAttempt.valid).toBe(false);
  });
});
