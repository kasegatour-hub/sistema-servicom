import { describe, expect, it } from "vitest";
import { passwordResetChannelSchema } from "./account.router";

describe("account password recovery channel", () => {
  it("allows email recovery", () => {
    expect(passwordResetChannelSchema.safeParse("email").success).toBe(true);
  });

  it("rejects SMS recovery until a provider is configured and verified", () => {
    expect(passwordResetChannelSchema.safeParse("sms").success).toBe(false);
  });
});
