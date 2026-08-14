import type { Response, Request } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionCookieOptions } from "./_core/cookies";

const COOKIE_NAME = "servicom_account_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_REAUTH_INTERVAL_SECONDS = 60 * 30;

export type AccountSessionPayload = {
  accountId: number;
  exp: number;
  iat: number;
  authTime: number;
  reauthRequired: boolean;
};

function configuredSeconds(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function getAccountSessionTtlSeconds(): number {
  return configuredSeconds("SERVICOM_ACCOUNT_SESSION_TTL_SECONDS", DEFAULT_SESSION_TTL_SECONDS);
}

export function getAccountReauthIntervalSeconds(): number {
  return configuredSeconds("SERVICOM_ACCOUNT_REAUTH_INTERVAL_SECONDS", DEFAULT_REAUTH_INTERVAL_SECONDS);
}

function readCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

function secret(): string {
  return process.env.JWT_SECRET || "servicom-local-development-secret";
}

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", secret()).update(input).digest("base64url");
}

function createJwt(accountId: number, authTimeMs = Date.now()): string {
  const issuedAt = Math.floor(authTimeMs / 1000);
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const payload = encodePart({
    sub: String(accountId),
    accountId,
    iat: issuedAt,
    auth_time: issuedAt,
    exp: issuedAt + getAccountSessionTtlSeconds(),
    typ: "servicom-account",
  });
  const signingInput = `${header}.${payload}`;
  return `${signingInput}.${sign(signingInput)}`;
}

function verifyJwt(token: string | undefined | null): AccountSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerEncoded, payloadEncoded, signature] = parts;
  const signingInput = `${headerEncoded}.${payloadEncoded}`;
  const expected = sign(signingInput);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const header = JSON.parse(Buffer.from(headerEncoded, "base64url").toString("utf8")) as { alg?: string; typ?: string };
    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const accountId = Number(payload.accountId);
    const exp = Number(payload.exp);
    const iat = Number(payload.iat);
    const authTime = Number(payload.auth_time);
    if (header.alg !== "HS256" || header.typ !== "JWT" || payload.typ !== "servicom-account") return null;
    if (!Number.isInteger(accountId) || accountId <= 0 || !Number.isFinite(exp) || exp <= now) return null;
    if (!Number.isFinite(iat) || !Number.isFinite(authTime) || String(payload.sub) !== String(accountId)) return null;
    return {
      accountId,
      exp,
      iat,
      authTime,
      reauthRequired: now - authTime >= getAccountReauthIntervalSeconds(),
    };
  } catch {
    return null;
  }
}

export function createAccountSession(accountId: number, authTimeMs = Date.now()): string {
  return createJwt(accountId, authTimeMs);
}

export function getAccountSession(req: Request): AccountSessionPayload | null {
  const raw = req.cookies?.[COOKIE_NAME] ?? readCookieHeader(req.headers.cookie, COOKIE_NAME);
  return verifyJwt(raw);
}

export function setAccountSession(req: Request, res: Response, accountId: number): void {
  res.cookie(COOKIE_NAME, createAccountSession(accountId), {
    ...getSessionCookieOptions(req),
    maxAge: getAccountSessionTtlSeconds() * 1000,
  });
}

export function clearAccountSession(req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: 0 });
}
