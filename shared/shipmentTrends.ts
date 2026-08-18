export type ShipmentTrendSource = {
  shipmentType?: string | null;
  route?: string | null;
  status?: string | null;
};

export type ShipmentTrendBucket = { label: string; count: number };

export type ShipmentTrendSummary = {
  total: number;
  byType: ShipmentTrendBucket[];
  byRoute: ShipmentTrendBucket[];
  byStatus: ShipmentTrendBucket[];
  mostFrequent: ShipmentTrendBucket | null;
  leastFrequent: ShipmentTrendBucket | null;
};

function countBy(items: ShipmentTrendSource[], field: keyof ShipmentTrendSource, fallback: string): ShipmentTrendBucket[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = String(item[field] || fallback);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es"));
}

export function summarizeShipmentTrends(shipments: ShipmentTrendSource[] | null | undefined): ShipmentTrendSummary {
  const items = shipments || [];
  const byType = countBy(items, "shipmentType", "Sin tipo").map(bucket => ({ ...bucket, label: bucket.label === "documento" ? "Documentos" : bucket.label === "encomienda" ? "Encomiendas" : bucket.label }));
  const byRoute = countBy(items, "route", "Ruta no indicada");
  const byStatus = countBy(items, "status", "Sin estado");
  const all = [...byType, ...byRoute, ...byStatus];
  const mostFrequent = all.length ? [...all].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es"))[0] : null;
  const leastFrequent = all.length ? [...all].sort((left, right) => left.count - right.count || left.label.localeCompare(right.label, "es"))[0] : null;
  return { total: items.length, byType, byRoute, byStatus, mostFrequent, leastFrequent };
}
