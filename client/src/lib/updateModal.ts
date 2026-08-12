export const UPDATE_PAYMENT_OPTIONS = [
  { value: "Falta cancelar", label: "No cancelado" },
  { value: "Pagado", label: "Pagado" },
] as const;

export type UpdateModalState = {
  showUpdateForm: boolean;
  selectedShipmentId: number | null;
};

export function closeUpdateModal(): UpdateModalState {
  return { showUpdateForm: false, selectedShipmentId: null };
}
