import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccountSession,
  getAccountSession,
} from "./localSession";
import {
  createAdminSession,
  getAdminSession,
} from "./adminSession";

function requestWithCookie(name: string, token: string) {
  return {
    headers: { cookie: `${name}=${encodeURIComponent(token)}` },
  } as any;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("JWT local sessions", () => {
  it("creates a three-part JWT and preserves the account identity", () => {
    const token = createAccountSession(42);
    expect(token.split(".")).toHaveLength(3);
    expect(getAccountSession(requestWithCookie("servicom_account_session", token))).toMatchObject({
      accountId: 42,
      reauthRequired: false,
    });
  });

  it("marks an active account session for reauthentication after the configured interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T01:00:00Z"));
    vi.stubEnv("SERVICOM_ACCOUNT_REAUTH_INTERVAL_SECONDS", "60");
    const token = createAccountSession(42);
    vi.advanceTimersByTime(61_000);

    expect(getAccountSession(requestWithCookie("servicom_account_session", token))).toMatchObject({
      accountId: 42,
      reauthRequired: true,
    });
  });

  it("rejects an expired account JWT", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T01:00:00Z"));
    vi.stubEnv("SERVICOM_ACCOUNT_SESSION_TTL_SECONDS", "2");
    const token = createAccountSession(42);
    vi.advanceTimersByTime(2_001);

    expect(getAccountSession(requestWithCookie("servicom_account_session", token))).toBeNull();
  });

  it("preserves the administrative role and rejects tampering", () => {
    const token = createAdminSession(9, "registrador");
    expect(token.split(".")).toHaveLength(3);
    expect(getAdminSession(requestWithCookie("servicom_admin_session", token))).toMatchObject({
      adminId: 9,
      role: "registrador",
      reauthRequired: false,
    });

    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(getAdminSession(requestWithCookie("servicom_admin_session", tampered))).toBeNull();
  });
});
