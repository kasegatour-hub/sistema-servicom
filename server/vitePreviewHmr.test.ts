import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Vite preview HMR configuration", () => {
  it("uses the secure preview websocket instead of an internal localhost client port", () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), "vite.config.ts"), "utf8");

    expect(config).toContain('protocol: "wss"');
    expect(config).toContain("clientPort: 443");
    expect(config).not.toMatch(/hmr[\s\S]{0,300}localhost:5173/);
  });
});
