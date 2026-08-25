import { describe, expect, it } from "vitest";
import { getPhoneValidationError, isValidInternationalPhone, normalizeInternationalPhone } from "./phoneValidation";

describe("country-aware phone validation", () => {
  it("accepts nine local digits for Peru and rejects that length for Italy", () => {
    expect(isValidInternationalPhone("+51 970 188 447")).toBe(true);
    expect(getPhoneValidationError("+39 389 766 372")).toContain("10 dígitos");
  });

  it("accepts a complete Italian mobile number", () => {
    expect(isValidInternationalPhone("+39 389 766 3723")).toBe(true);
  });

  it("normalizes nine local Peruvian digits sent by a mobile input", () => {
    const normalized = normalizeInternationalPhone("970188447");
    expect(normalized).toBe("+51 970 188 447");
    expect(isValidInternationalPhone(normalized)).toBe(true);
  });
});
