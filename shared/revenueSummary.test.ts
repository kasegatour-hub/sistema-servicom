import { describe, expect, it } from "vitest";
import { summarizeRevenue } from "./revenueSummary";

describe("revenue summary", () => {
  it("counts only confirmed payments as income and keeps pending amounts separate", () => {
    expect(summarizeRevenue([
      { finalPriceEur: "45", paymentStatus: "Pagado", shipmentType: "documento" },
      { finalPriceEur: 27, paymentStatus: "Pagado", shipmentType: "encomienda" },
      { finalPriceEur: "50", paymentStatus: "Falta cancelar", shipmentType: "documento" },
    ])).toEqual({ confirmedEur: 72, pendingEur: 50, paidCount: 2, pendingCount: 1, documentsEur: 45, parcelsEur: 27, totalCount: 3 });
  });
});
