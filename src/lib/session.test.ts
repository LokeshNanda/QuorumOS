import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminToken, verifyAdminToken, verifyAdminPassword } from "./session";

describe("createAdminToken and verifyAdminToken", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-min-32-chars-long!!");
  });

  it("creates token that verifies successfully", async () => {
    const token = await createAdminToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    const valid = await verifyAdminToken(token);
    expect(valid).toBe(true);
  });

  it("rejects invalid token", async () => {
    const valid = await verifyAdminToken("invalid-token");
    expect(valid).toBe(false);
  });

  it("rejects tampered token", async () => {
    const token = await createAdminToken();
    const tampered = token.slice(0, -5) + "xxxxx";
    const valid = await verifyAdminToken(tampered);
    expect(valid).toBe(false);
  });
});

describe("verifyAdminPassword", () => {
  it("returns true when ADMIN_PASSWORD is not set", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(verifyAdminPassword("anything")).toBe(true);
  });

  it("returns true for correct password when set", () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret123");
    expect(verifyAdminPassword("secret123")).toBe(true);
  });

  it("returns false for wrong password when set", () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret123");
    expect(verifyAdminPassword("wrong")).toBe(false);
  });
});
