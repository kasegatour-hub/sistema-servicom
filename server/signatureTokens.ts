import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGNATURE_TOKEN_TTL_MS = 30 * 60 * 1000;

export function createSignatureToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SIGNATURE_TOKEN_TTL_MS);
  return { token, tokenHash: hashSignatureToken(token), expiresAt };
}

export function hashSignatureToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signatureTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSignatureToken(token), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isSignatureTokenExpired(expiresAt: Date | string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}
