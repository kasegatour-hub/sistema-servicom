import { describe, expect, it } from "vitest";
import { formatLocalPhoneInput, formatPhoneNumber, splitPhoneNumber } from "./phoneFormatting";

describe("phone formatting", () => {
  it("separates the country code from the local number", () => {
    expect(splitPhoneNumber("+59947323224")).toEqual({ countryCode: "+599", localNumber: "47323224" });
    expect(splitPhoneNumber("+39 389 766 3723")).toEqual({ countryCode: "+39", localNumber: "3897663723" });
  });

  it("recognizes normalized digit-only storage values", () => {
    expect(formatPhoneNumber("51970188447")).toBe("+51 970 188 447");
    expect(formatPhoneNumber("393897663723")).toBe("+39 389 766 3723");
  });

  it("formats local digits with human-readable spaces", () => {
    expect(formatLocalPhoneInput("970188447")).toBe("970 188 447");
    expect(formatLocalPhoneInput("3897663723")).toBe("389 766 3723");
  });

  it("keeps country code separate and formats the complete phone", () => {
    expect(formatPhoneNumber("+59947323224")).toBe("+599 473 232 24");
    expect(formatPhoneNumber("+51 970188447")).toBe("+51 970 188 447");
  });

  it("does not fabricate a country code for a local-only number", () => {
    expect(formatPhoneNumber("970188447")).toBe("970 188 447");
  });
});
