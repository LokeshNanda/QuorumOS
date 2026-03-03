/**
 * OTP generation and validation
 * Per docs/03-security-model.md:
 * - 6-digit numeric OTP
 * - Expires in 5 minutes
 * - Max 3 attempts
 * - Stored as SHA-256(otp + session_salt)
 */

import { randomInt } from "node:crypto";
import { hashOtp } from "./crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

export function generateOtp(): string {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(randomInt(min, max + 1));
}

export function getOtpExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES);
  return d;
}

export { MAX_ATTEMPTS };

export function verifyOtpHash(
  inputOtp: string,
  sessionSalt: string,
  storedHash: string
): boolean {
  const computed = hashOtp(inputOtp, sessionSalt);
  return computed === storedHash;
}
