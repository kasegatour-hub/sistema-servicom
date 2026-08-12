import { describe, expect, it } from "vitest";
import { paginateItems } from "./pagination";

describe("shipment pagination", () => {
  it("returns the requested page and total page count", () => {
    expect(paginateItems([1, 2, 3, 4, 5], 2, 2)).toEqual({
      currentPage: 2,
      totalPages: 3,
      items: [3, 4],
    });
  });

  it("clamps invalid pages and handles empty lists", () => {
    expect(paginateItems([], 9, 10)).toEqual({ currentPage: 1, totalPages: 1, items: [] });
    expect(paginateItems([1, 2], 0, 1)).toEqual({ currentPage: 1, totalPages: 2, items: [1] });
  });
});
