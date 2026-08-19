import { describe, expect, it } from "vitest";
import { getPasswordRequirements, isSecurePassword, PASSWORD_MIN_LENGTH } from "./passwordPolicy";

describe("passwordPolicy", () => {
  it("acepta una contraseña de 12 caracteres con todos los grupos requeridos", () => {
    expect(isSecurePassword("ClaveSegura#2026")).toBe(true);
    expect(getPasswordRequirements("ClaveSegura#2026").every(requirement => requirement.met)).toBe(true);
  });

  it("rechaza contraseñas que omiten longitud, mayúscula, minúscula, número o símbolo", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(isSecurePassword("Corta#1")).toBe(false);
    expect(isSecurePassword("clavesegura#2026")).toBe(false);
    expect(isSecurePassword("CLAVESEGURA#2026")).toBe(false);
    expect(isSecurePassword("ClaveSegura#abcd")).toBe(false);
    expect(isSecurePassword("ClaveSegura2026")).toBe(false);
  });
});
