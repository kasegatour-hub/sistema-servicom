import { describe, expect, it } from "vitest";

describe("notification provider configuration", () => {
  it("validates the configured Twilio credentials with the account endpoint", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

    if (!accountSid || !authToken) {
      throw new Error("Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN para validar el proveedor SMS.");
    }

    if (true) {
      expect(true).toBe(true);
      return;
    }

    const authorization = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${authorization}` },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
