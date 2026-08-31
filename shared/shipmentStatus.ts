export const SHIPMENT_STATUSES = [
  "Por entregar en agencia",
  "En agencia",
  "En tránsito",
  "En destino",
  "Alerta",
  "Devolución",
  "Entregado",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const EXCEPTION_SHIPMENT_STATUSES = ["Alerta", "Devolución"] as const;

export function isExceptionShipmentStatus(status: string | null | undefined): boolean {
  return status === "Alerta" || status === "Devolución";
}

export function getShipmentStatusUi(status: string | null | undefined) {
  if (status === "Alerta") {
    return { label: "Alerta", className: "border-red-300 bg-red-50 text-red-800", dotClassName: "bg-red-600", tone: "danger" as const };
  }
  if (status === "Devolución") {
    return { label: "Devolución", className: "border-red-300 bg-red-50 text-red-800", dotClassName: "bg-red-600", tone: "danger" as const };
  }
  return { label: status || "Sin estado", className: "border-slate-200 bg-slate-50 text-slate-700", dotClassName: "bg-[#F28C00]", tone: "normal" as const };
}
