export type RevenueShipment = {
  finalPriceEur?: string | number | null;
  basePriceEur?: string | number | null;
  paymentStatus?: string | null;
  shipmentType?: "documento" | "encomienda" | string | null;
};

const money = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function summarizeRevenue(shipments: RevenueShipment[] | null | undefined) {
  const rows = shipments || [];
  let confirmedEur = 0;
  let pendingEur = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let documentsEur = 0;
  let parcelsEur = 0;

  for (const shipment of rows) {
    const amount = money(shipment.finalPriceEur ?? shipment.basePriceEur);
    if (shipment.paymentStatus === "Pagado") {
      confirmedEur += amount;
      paidCount += 1;
      if (shipment.shipmentType === "encomienda") parcelsEur += amount;
      else documentsEur += amount;
    } else {
      pendingEur += amount;
      pendingCount += 1;
    }
  }

  return {
    confirmedEur: Math.round(confirmedEur * 100) / 100,
    pendingEur: Math.round(pendingEur * 100) / 100,
    paidCount,
    pendingCount,
    documentsEur: Math.round(documentsEur * 100) / 100,
    parcelsEur: Math.round(parcelsEur * 100) / 100,
    totalCount: rows.length,
  };
}
