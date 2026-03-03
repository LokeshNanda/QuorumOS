/**
 * Admin session management using signed JWT cookies
 * Protects /admin routes and admin-only API endpoints
 */

import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "quorumos_admin";
const MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "quorumos-dev-secret-min-32-chars-long!!";
  return new TextEncoder().encode(secret);
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export function isAdminAuthEnabled(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true; // Auth disabled
  return password === adminPassword;
}

export { COOKIE_NAME };
