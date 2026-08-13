export function getPaymentStatusUi(status?: string | null) {
  const normalizedStatus = typeof status === "string" ? status.trim() : "";
  const isPaid = normalizedStatus === "Pagado";
  const isPending = normalizedStatus === "Falta cancelar";
  return {
    label: isPaid ? "Pagado" : isPending ? "No cancelado" : "Sin marcar",
    badgeClass: isPaid ? "bg-emerald-100 text-emerald-800" : isPending ? "bg-rose-100 text-rose-800" : "bg-transparent text-slate-900",
    isPaid,
    isPending,
    isMarked: isPaid || isPending,
  };
}
