import { describe, expect, it } from "vitest";
import { DNI_MAX_LENGTH, digitsOnly, dniDigitsOnly, isDigitsOnly, isTextOnly, isValidDni, textOnly } from "./inputValidation";

describe("client identity input validation", () => {
  it("detects invalid text before the sanitized value is stored", () => {
    expect(isTextOnly("Ana3")).toBe(false);
    expect(textOnly("Ana3")).toBe("Ana");
    expect(isTextOnly("Ana María")).toBe(true);
  });

  it("detects invalid DNI before removing non-numeric characters", () => {
    expect(isDigitsOnly("71234567A")).toBe(false);
    expect(digitsOnly("71234567A")).toBe("71234567");
    expect(isDigitsOnly("71234567")).toBe(true);
  });

  it("accepts normalized text and DNI with surrounding spaces", () => {
    expect(isTextOnly("  María   José  ")).toBe(true);
    expect(isDigitsOnly(" 71234567 ")).toBe(true);
    expect(isTextOnly("   ")).toBe(true);
    expect(isDigitsOnly("   ")).toBe(true);
  });

  it("caps DNI values at eight digits", () => {
    expect(DNI_MAX_LENGTH).toBe(8);
    expect(dniDigitsOnly("1234567890")).toBe("12345678");
    expect(isValidDni("12345678")).toBe(true);
    expect(isValidDni("123456789")).toBe(false);
  });
});
