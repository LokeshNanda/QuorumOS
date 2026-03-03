import { describe, it, expect } from "vitest";
import { generateOtp, getOtpExpiry, verifyOtpHash } from "./otp";
import { hashOtp } from "./crypto";

describe("generateOtp", () => {
  it("returns 6-digit string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("returns different values each call", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(generateOtp());
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("getOtpExpiry", () => {
  it("returns date 5 minutes in future", () => {
    const before = new Date();
    const expiry = getOtpExpiry();
    const after = new Date();
    const diff = expiry.getTime() - before.getTime();
    expect(diff).toBeGreaterThanOrEqual(4 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(6 * 60 * 1000);
  });
});

describe("verifyOtpHash", () => {
  it("returns true for correct OTP", () => {
    const otp = "123456";
    const salt = "session_salt";
    const storedHash = hashOtp(otp, salt);
    expect(verifyOtpHash(otp, salt, storedHash)).toBe(true);
  });

  it("returns false for wrong OTP", () => {
    const salt = "session_salt";
    const storedHash = hashOtp("123456", salt);
    expect(verifyOtpHash("654321", salt, storedHash)).toBe(false);
  });

  it("returns false for wrong salt", () => {
    const otp = "123456";
    const storedHash = hashOtp(otp, "salt1");
    expect(verifyOtpHash(otp, "salt2", storedHash)).toBe(false);
  });
});
