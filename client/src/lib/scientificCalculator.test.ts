import { describe, expect, it } from "vitest";
import { evaluateScientificExpression } from "./scientificCalculator";

describe("evaluateScientificExpression", () => {
  it("calcula operaciones y potencias", () => {
    expect(evaluateScientificExpression("(13.5 * 2.5) + 10")).toBe(43.75);
    expect(evaluateScientificExpression("2^4")).toBe(16);
  });

  it("calcula funciones científicas básicas", () => {
    expect(evaluateScientificExpression("sqrt(81) + abs(-2)")).toBe(11);
    expect(evaluateScientificExpression("sin(pi / 2)")).toBeCloseTo(1, 8);
  });

  it("rechaza identificadores y caracteres no permitidos", () => {
    expect(() => evaluateScientificExpression("constructor(1)")).toThrow("Solo se admiten");
    expect(() => evaluateScientificExpression("2; alert(1)")).toThrow("caracteres no permitidos");
  });
});
