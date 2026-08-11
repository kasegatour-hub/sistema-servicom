import { describe, expect, it } from "vitest";
import { generateVerificationCode, hashPassword, hashVerificationCode, verifyPassword } from "./localAuth";

describe("local account security helpers", () => {
  it("hashes and verifies passwords without storing the original value", async () => {
    const password = "ClaveSegura-2026";
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("creates six-digit codes and stores only their digest", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(hashVerificationCode(code)).not.toBe(code);
  });
});
