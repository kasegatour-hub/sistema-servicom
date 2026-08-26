import React, { type CSSProperties } from "react";
import { CarFront, CircleCheck, MapPin, PackageCheck, Plane } from "lucide-react";

type TrackingJourneyAnimationProps = { status?: string | null };

const STATUS_PROGRESS: Record<string, { progress: number; label: string }> = {
  "Por entregar en agencia": { progress: 8, label: "Preparando el envío en agencia" },
  "En agencia": { progress: 24, label: "Envío recibido en agencia" },
  "En tránsito": { progress: 58, label: "En ruta hacia el destino" },
  "En destino": { progress: 82, label: "Envío llegó a destino" },
  "Entregado": { progress: 100, label: "Envío entregado correctamente" },
};

export function TrackingJourneyAnimation({ status }: TrackingJourneyAnimationProps) {
  const journey = STATUS_PROGRESS[status || ""] || { progress: 48, label: "Rastrea tu envío de forma segura" };
  const delivered = status === "Entregado";

  return <section className="tracking-journey" aria-label={`Trayecto del envío: ${journey.label}`}>
    <div className="tracking-journey-sky" aria-hidden="true"><span className="tracking-journey-cloud cloud-one" /><span className="tracking-journey-cloud cloud-two" /><Plane className="tracking-journey-plane" /></div>
    <div className="tracking-journey-labels"><span><PackageCheck className="h-4 w-4" aria-hidden="true" /> Agencia</span><span><MapPin className="h-4 w-4" aria-hidden="true" /> Destino</span></div>
    <div className="tracking-journey-road" style={{ "--journey-progress": `${journey.progress}%` } as CSSProperties} aria-hidden="true"><div className="tracking-journey-road-line" /><CarFront className={`tracking-journey-car ${delivered ? "is-delivered" : ""}`} /><div className="tracking-journey-destination">{delivered ? <CircleCheck className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}</div></div>
    <p className="tracking-journey-caption" aria-live="polite">{journey.label}</p>
  </section>;
}
