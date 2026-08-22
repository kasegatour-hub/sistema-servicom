import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionCookieOptions } from "./_core/cookies";

const COOKIE_NAME = "servicom_admin_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_REAUTH_INTERVAL_SECONDS = 60 * 30;
const DEFAULT_REMEMBERED_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_REMEMBERED_REAUTH_INTERVAL_SECONDS = 60 * 60 * 24 * 30;

export type AdminRole = "registrador" | "superadmin";
export type AdminSessionPayload = {
  adminId: number;
  role: AdminRole;
  isWorkspaceIsolated: boolean;
  exp: number;
  iat: number;
  authTime: number;
  remembered: boolean;
  reauthRequired: boolean;
};

function configuredSeconds(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function getAdminSessionTtlSeconds(): number {
  return configuredSeconds("SERVICOM_ADMIN_SESSION_TTL_SECONDS", DEFAULT_SESSION_TTL_SECONDS);
}

export function getAdminReauthIntervalSeconds(): number {
  return configuredSeconds("SERVICOM_ADMIN_REAUTH_INTERVAL_SECONDS", DEFAULT_REAUTH_INTERVAL_SECONDS);
}

export function getRememberedAdminSessionTtlSeconds(): number {
  return configuredSeconds("SERVICOM_REMEMBERED_ADMIN_SESSION_TTL_SECONDS", DEFAULT_REMEMBERED_SESSION_TTL_SECONDS);
}

export function getRememberedAdminReauthIntervalSeconds(): number {
  return configuredSeconds("SERVICOM_REMEMBERED_ADMIN_REAUTH_INTERVAL_SECONDS", DEFAULT_REMEMBERED_REAUTH_INTERVAL_SECONDS);
}

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

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", secret()).update(input).digest("base64url");
}

function createJwt(adminId: number, role: AdminRole, remembered = false, authTimeMs = Date.now(), isWorkspaceIsolated = false): string {
  const issuedAt = Math.floor(authTimeMs / 1000);
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const payload = encodePart({
    sub: String(adminId),
    adminId,
    role,
    is_workspace_isolated: isWorkspaceIsolated,
    iat: issuedAt,
    auth_time: issuedAt,
    remembered,
    exp: issuedAt + (remembered ? getRememberedAdminSessionTtlSeconds() : getAdminSessionTtlSeconds()),
    typ: "servicom-admin",
  });
  const signingInput = `${header}.${payload}`;
  return `${signingInput}.${sign(signingInput)}`;
}

function verifyJwt(token: string | undefined | null): AdminSessionPayload | null {
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
    const adminId = Number(payload.adminId);
    const exp = Number(payload.exp);
    const iat = Number(payload.iat);
    const authTime = Number(payload.auth_time);
    const remembered = payload.remembered === true;
    const role = payload.role;
    if (header.alg !== "HS256" || header.typ !== "JWT" || payload.typ !== "servicom-admin") return null;
    if (!Number.isInteger(adminId) || adminId <= 0 || !Number.isFinite(exp) || exp <= now) return null;
    if (!Number.isFinite(iat) || !Number.isFinite(authTime) || String(payload.sub) !== String(adminId)) return null;
    if (role !== "registrador" && role !== "superadmin") return null;
    return {
      adminId,
      role,
      isWorkspaceIsolated: payload.is_workspace_isolated === true,
      exp,
      iat,
      authTime,
      remembered,
      reauthRequired: now - authTime >= (remembered ? getRememberedAdminReauthIntervalSeconds() : getAdminReauthIntervalSeconds()),
    };
  } catch {
    return null;
  }
}

export function createAdminSession(adminId: number, role: AdminRole, remembered = false, authTimeMs = Date.now(), isWorkspaceIsolated = false): string {
  return createJwt(adminId, role, remembered, authTimeMs, isWorkspaceIsolated);
}

export function getAdminSession(req: Request): AdminSessionPayload | null {
  const raw = req.cookies?.[COOKIE_NAME] ?? readCookieHeader(req.headers.cookie);
  return verifyJwt(raw);
}

export function setAdminSession(req: Request, res: Response, adminId: number, role: AdminRole, remembered = false, isWorkspaceIsolated = false): void {
  res.cookie(COOKIE_NAME, createAdminSession(adminId, role, remembered, Date.now(), isWorkspaceIsolated), {
    ...getSessionCookieOptions(req),
    maxAge: (remembered ? getRememberedAdminSessionTtlSeconds() : getAdminSessionTtlSeconds()) * 1000,
  });
}

export function clearAdminSession(req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: 0 });
}
