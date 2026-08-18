import { describe, expect, it } from "vitest";
import { getFuzzySearchScore, matchesFuzzySearch, rankFuzzyMatches } from "./fuzzySearch";

describe("fuzzy search", () => {
  it("encuentra texto por prefijo, tildes, letras omitidas y errores menores", () => {
    expect(matchesFuzzySearch("sanchez ar", "Sánchez Arias")).toBe(true);
    expect(matchesFuzzySearch("nacimento", "Acta de nacimiento")).toBe(true);
    expect(matchesFuzzySearch("71234567", "Ana Pérez 71234567")).toBe(true);
    expect(getFuzzySearchScore("sanchez", "Sánchez Arias")).toBeGreaterThan(0);
  });

  it("prioriza el resultado con mayor relación textual", () => {
    const ranked = rankFuzzyMatches(["Sánchez Arias", "María Sánchez", "Sandra García"], "sanchez ar", value => value);
    expect(ranked).toEqual(["Sánchez Arias", "María Sánchez"]);
  });
});
