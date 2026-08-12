export function isPaidInLima(paymentCondition?: string | null) {
  return typeof paymentCondition === "string" && /\blima\b/i.test(paymentCondition);
}

export function getPaymentStatusUi(status?: string | null, paymentCondition?: string | null) {
  const isPaid = status === "Pagado";
  const paidInLima = isPaid && isPaidInLima(paymentCondition);

  return {
    label: isPaid ? "Pagado" : "No cancelado",
    badgeClass: !isPaid
      ? "bg-rose-100 text-rose-800"
      : paidInLima
        ? "bg-emerald-100 text-emerald-800"
        : "text-black",
    isPaid,
    paidInLima,
  };
}
