import React from "react";
import { SHIPMENT_ENDPOINTS, deriveLegacyShipmentRoute, normalizeIndependentEndpoints, type ShipmentEndpoint } from "@shared/shipmentEndpoints";

type IndependentEndpointsFieldsProps = {
  route?: string | null;
  className?: string;
  onRouteChange: (route: string, endpoints: { originPoint: ShipmentEndpoint; destinationPoint: ShipmentEndpoint }) => void;
};

const endpointOptions: ShipmentEndpoint[] = [SHIPMENT_ENDPOINTS.TORINO, SHIPMENT_ENDPOINTS.LIMA, SHIPMENT_ENDPOINTS.PROVINCIA];

export function IndependentEndpointsFields({ route, className = "", onRouteChange }: IndependentEndpointsFieldsProps) {
  const endpoints = normalizeIndependentEndpoints({ route });
  const update = (key: "originPoint" | "destinationPoint", value: ShipmentEndpoint) => {
    const next = { ...endpoints, [key]: value };
    onRouteChange(deriveLegacyShipmentRoute(next), next);
  };

  return (
    <div className={`grid gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 md:grid-cols-2 ${className}`} aria-label="Origen y destino independientes">
      <span className="sr-only">Ruta de envío</span>
      <select aria-label="Ruta de envío" className="sr-only" value={route || "Lima - Torino"} onChange={event => {
        const nextRoute = event.target.value;
        const nextEndpoints = normalizeIndependentEndpoints({ route: nextRoute });
        onRouteChange(nextRoute, nextEndpoints);
      }}>
        <option value="Lima - Torino">Lima – Torino</option>
        <option value="Torino - Lima">Torino – Lima</option>
        <option value="Torino - Lima + provincia" onClick={() => onRouteChange("Torino - Lima + provincia", normalizeIndependentEndpoints({ route: "Torino - Lima + provincia" }))}>Torino – Lima + provincia</option>
        <option value="Provincia - Lima - Torino">Provincia – Lima – Torino</option>
      </select>
      <label className="block text-sm font-bold text-[#0B2B5E]">
        Punto de origen
        <select value={endpoints.originPoint} onChange={event => update("originPoint", event.target.value as ShipmentEndpoint)} className="mt-2 min-h-12 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-base font-semibold text-slate-800 focus:border-[#0B2B5E] focus:outline-none focus:ring-2 focus:ring-blue-100">
          {endpointOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label className="block text-sm font-bold text-[#0B2B5E]">
        Punto de destino
        <select value={endpoints.destinationPoint} onChange={event => update("destinationPoint", event.target.value as ShipmentEndpoint)} className="mt-2 min-h-12 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-base font-semibold text-slate-800 focus:border-[#0B2B5E] focus:outline-none focus:ring-2 focus:ring-blue-100">
          {endpointOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-slate-700">
        Lima funciona como centro de distribución interno cuando el envío conecta Torino y Provincia. La ruta técnica se genera automáticamente y no se muestra al cliente.
      </div>
    </div>
  );
}
