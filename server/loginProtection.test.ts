import { describe, expect, it } from "vitest";
import { getFailureUpdate, getRemainingLockoutSeconds, MAX_PASSWORD_FAILURES, PASSWORD_LOCKOUT_SECONDS } from "./loginProtection";

describe("protección contra intentos de contraseña", () => {
  it("bloquea durante 60 segundos al quinto intento fallido", () => {
    const now = new Date("2026-08-19T22:00:00.000Z");
    let attempts = 0;
    let lockedUntil: Date | null = null;
    for (let count = 0; count < MAX_PASSWORD_FAILURES; count += 1) {
      const result = getFailureUpdate(attempts, lockedUntil, now);
      attempts = result.attempts;
      lockedUntil = result.lockedUntil;
    }
    expect(lockedUntil?.getTime()).toBe(now.getTime() + PASSWORD_LOCKOUT_SECONDS * 1000);
    expect(getRemainingLockoutSeconds(lockedUntil, now.getTime())).toBe(PASSWORD_LOCKOUT_SECONDS);
  });

  it("reinicia el contador cuando el bloqueo ya terminó", () => {
    const now = new Date("2026-08-19T22:01:01.000Z");
    const result = getFailureUpdate(0, new Date("2026-08-19T22:01:00.000Z"), now);
    expect(result).toEqual({ attempts: 1, lockedUntil: null });
  });
});
