export function getPaymentStatusUi(status?: string | null) {
  const isPaid = status === "Pagado";
  return {
    label: isPaid ? "Pagado" : "No cancelado",
    badgeClass: isPaid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
    isPaid,
  };
}
