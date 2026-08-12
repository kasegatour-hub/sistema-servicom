import { describe, expect, it } from "vitest";
import { digitsOnly, isDigitsOnly, isTextOnly, textOnly } from "./inputValidation";

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
});
