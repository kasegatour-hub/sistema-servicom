export type RevenueShipment = {
  finalPriceEur?: string | number | null;
  basePriceEur?: string | number | null;
  paymentStatus?: string | null;
  shipmentType?: "documento" | "encomienda" | string | null;
  deletedAt?: string | Date | null;
  hiddenFromRegistradoresAt?: string | Date | null;
  isProvinceDelivery?: boolean | number | null;
  provinceOperationalCostSoles?: string | number | null;
};

const money = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function summarizeRevenue(shipments: RevenueShipment[] | null | undefined) {
  const rows = (shipments || []).filter(shipment => !shipment.deletedAt && !shipment.hiddenFromRegistradoresAt);
  let confirmedEur = 0;
  let pendingEur = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let documentsEur = 0;
  let parcelsEur = 0;
  let unpricedPaidCount = 0;
  let provinceOperationalCostSoles = 0;
  let provinceShipmentCount = 0;

  for (const shipment of rows) {
    if (Boolean(shipment.isProvinceDelivery) && money(shipment.provinceOperationalCostSoles) > 0) {
      provinceShipmentCount += 1;
      provinceOperationalCostSoles += money(shipment.provinceOperationalCostSoles);
    }
    const storedPrice = shipment.finalPriceEur ?? shipment.basePriceEur;
    const hasStoredPrice = storedPrice !== null && storedPrice !== undefined && String(storedPrice).trim() !== "";
    const amount = money(storedPrice);
    if (shipment.paymentStatus === "Pagado") {
      paidCount += 1;
      if (!hasStoredPrice) {
        unpricedPaidCount += 1;
      } else {
        confirmedEur += amount;
        if (shipment.shipmentType === "encomienda") parcelsEur += amount;
        else documentsEur += amount;
      }
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
    unpricedPaidCount,
    totalCount: rows.length,
    provinceShipmentCount,
    provinceOperationalCostSoles: Math.round(provinceOperationalCostSoles * 100) / 100,
  };
}
