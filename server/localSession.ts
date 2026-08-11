import { createHmac, timingSafeEqual } from "node:crypto";
import type { Response, Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

const COOKIE_NAME = "servicom_account_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = { accountId: number; exp: number };

function secret(): string {
  return process.env.JWT_SECRET || "servicom-local-development-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createAccountSession(accountId: number): string {
  const payload: SessionPayload = { accountId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function getAccountSession(req: Request): SessionPayload | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw || typeof raw !== "string") return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!Number.isInteger(payload.accountId) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAccountSession(req: Request, res: Response, accountId: number): void {
  res.cookie(COOKIE_NAME, createAccountSession(accountId), {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearAccountSession(req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: 0 });
}
