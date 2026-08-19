import React, { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { UPDATE_PAYMENT_OPTIONS } from "@/lib/updateModal";

type UpdateShipmentModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (event?: any) => void;
  isSubmitting?: boolean;
  children: ReactNode;
  paymentStatus?: string;
  registerPaymentStatus?: (name: "paymentStatus") => any;
  shipmentType?: "documento" | "encomienda";
};

export function UpdateShipmentModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  children,
  paymentStatus,
  registerPaymentStatus,
  shipmentType = "encomienda",
}: UpdateShipmentModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-shipment-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Card className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto border-0 p-6 shadow-lg">
        <button
          type="button"
          aria-label="Cerrar actualización"
          title="Cerrar"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pr-12">
          <h3 id="update-shipment-title" className="mb-1 text-lg font-semibold">Actualizar Estado de {shipmentType === "documento" ? "Documento" : "Encomienda"}</h3>
          <p className="mb-4 text-sm text-slate-500">Actualiza el estado del {shipmentType === "documento" ? "documento" : "envío"} y, si corresponde, marca el pago.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {children}

          <div className="border-t pt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Estado de Pago</label>
            <select
              aria-label="Estado de Pago"
              {...(registerPaymentStatus ? registerPaymentStatus("paymentStatus") : {})}
              defaultValue={paymentStatus || "Falta cancelar"}
              className="w-full rounded-md border-2 border-slate-200 bg-white p-2 text-sm font-medium focus:border-primary"
            >
              {UPDATE_PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white hover:bg-primary/90">
              {isSubmitting ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
