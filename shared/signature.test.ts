import { describe, expect, it } from "vitest";
import { buildSignatureSvgMarkup, parseSignatureStrokes, serializeSignatureStrokes } from "./signature";

describe("electronic signature strokes", () => {
  it("round-trips valid strokes and renders them in the corporate blue", () => {
    const encoded = serializeSignatureStrokes([
      [{ x: 10, y: 20 }, { x: 80, y: 40 }, { x: 140, y: 30 }],
    ]);
    expect(parseSignatureStrokes(encoded)).toEqual([
      [{ x: 10, y: 20 }, { x: 80, y: 40 }, { x: 140, y: 30 }],
    ]);
    const svg = buildSignatureSvgMarkup(encoded);
    expect(svg).toContain('stroke="#0B2B5E"');
    expect(svg).toContain('points="10,20 80,40 140,30"');
  });

  it("rejects malformed, out-of-bounds and oversized signatures", () => {
    expect(() => parseSignatureStrokes("not-json")).toThrow();
    expect(() => parseSignatureStrokes(JSON.stringify([[{ x: -1, y: 20 }, { x: 80, y: 40 }]]))).toThrow();
    expect(() => parseSignatureStrokes(JSON.stringify([[{ x: 10, y: 20 }]]))).toThrow();
    expect(() => buildSignatureSvgMarkup(undefined)).toThrow();
  });
});
