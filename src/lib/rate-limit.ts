/**
 * Rate limiting via Upstash Redis
 * Per docs/03-security-model.md and docs/10-threat-model.md
 * Mitigates OTP brute force, replay attacks
 */

import { Redis } from "@upstash/redis";

const WINDOW_SEC = 60;
const OTP_PER_EMAIL = 3; // max OTP requests per email per window
const OTP_PER_IP = 5; // max OTP requests per IP per window

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function checkOtpRateLimit(
  identifier: string,
  type: "email" | "ip"
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: OTP_PER_EMAIL };

  const key = `otp:${type}:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, WINDOW_SEC);

  const limit = type === "email" ? OTP_PER_EMAIL : OTP_PER_IP;
  const remaining = Math.max(0, limit - count);
  return { allowed: count <= limit, remaining };
}
