import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

const COOKIE_NAME = "servicom_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type AdminRole = "admin" | "superadmin";
type AdminSessionPayload = { adminId: number; role: AdminRole; exp: number };

function readCookieHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key === COOKIE_NAME) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

function secret(): string {
  return process.env.JWT_SECRET || "servicom-local-development-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createAdminSession(adminId: number, role: AdminRole): string {
  const payload: AdminSessionPayload = { adminId, role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function getAdminSession(req: Request): AdminSessionPayload | null {
  const raw = req.cookies?.[COOKIE_NAME] ?? readCookieHeader(req.headers.cookie);
  if (!raw || typeof raw !== "string") return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminSessionPayload;
    if (!Number.isInteger(payload.adminId) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "admin" && payload.role !== "superadmin") return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAdminSession(req: Request, res: Response, adminId: number, role: AdminRole): void {
  res.cookie(COOKIE_NAME, createAdminSession(adminId, role), {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearAdminSession(req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: 0 });
}
