import { describe, expect, it } from "vitest";

describe("Servicom branding configuration", () => {
  it("has the configured application title and logo path", async () => {
    const response = await fetch("http://127.0.0.1:3000/");
    expect(response.ok).toBe(true);
    expect(process.env.VITE_APP_TITLE).toContain("Servicom Internacional");
    expect(process.env.VITE_APP_LOGO).toBe("/manus-storage/servicom_logo_final_e7ce35aa.png");
  }, 15_000);
});
