import { describe, expect, it } from "vitest";
import { isValidIdentityDocument, normalizeIdentityDocument } from "./identityDocuments";

describe("identity documents", () => {
  it("requires exactly eight numeric digits for the Peruvian DNI", () => {
    expect(isValidIdentityDocument("71234567", "dni_peru")).toBe(true);
    expect(isValidIdentityDocument("7123456A", "dni_peru")).toBe(false);
    expect(isValidIdentityDocument("712345678", "dni_peru")).toBe(false);
  });

  it("accepts passports with 6 to 9 alphanumeric characters and removes unsupported characters", () => {
    expect(isValidIdentityDocument("AB1234567", "pasaporte")).toBe(true);
    expect(isValidIdentityDocument("A12345", "pasaporte")).toBe(true);
    expect(isValidIdentityDocument("AB12345678", "pasaporte")).toBe(false);
    expect(normalizeIdentityDocument("ab 12-34567", "pasaporte")).toBe("AB1234567");
  });

  it("requires the official nine-character CIE pattern", () => {
    expect(isValidIdentityDocument("CA12345AB", "carta_identita_italia")).toBe(true);
    expect(isValidIdentityDocument("CA1234ABB", "carta_identita_italia")).toBe(false);
    expect(isValidIdentityDocument("CA12345A1", "carta_identita_italia")).toBe(false);
  });
});
