import { describe, expect, it } from "vitest";
import { summarizeRevenue } from "./revenueSummary";

describe("revenue summary", () => {
  it("counts only confirmed payments as income and keeps pending amounts separate", () => {
    expect(summarizeRevenue([
      { finalPriceEur: "45", paymentStatus: "Pagado", shipmentType: "documento" },
      { finalPriceEur: 27, paymentStatus: "Pagado", shipmentType: "encomienda" },
      { finalPriceEur: "50", paymentStatus: "Falta cancelar", shipmentType: "documento" },
    ])).toEqual({ confirmedEur: 72, pendingEur: 50, paidCount: 2, pendingCount: 1, documentsEur: 45, parcelsEur: 27, unpricedPaidCount: 0, totalCount: 3 });
  });

  it("excludes deleted and hidden shipments and flags paid records that have no price", () => {
    expect(summarizeRevenue([
      { finalPriceEur: 45, paymentStatus: "Pagado", shipmentType: "documento" },
      { finalPriceEur: 80, paymentStatus: "Pagado", shipmentType: "encomienda", deletedAt: new Date() },
      { finalPriceEur: 60, paymentStatus: "Pagado", shipmentType: "documento", hiddenFromRegistradoresAt: new Date() },
      { paymentStatus: "Pagado", shipmentType: "documento" },
    ])).toMatchObject({ confirmedEur: 45, documentsEur: 45, parcelsEur: 0, paidCount: 2, unpricedPaidCount: 1, totalCount: 2 });
  });
});
