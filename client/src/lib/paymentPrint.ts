import { getPaymentStatusUi } from "./paymentStatus";

export function getPaymentPrintPresentation(status?: string | null) {
  const payment = getPaymentStatusUi(status);
  return {
    isPaid: payment.isPaid,
    isPending: payment.isPending,
    paidColor: payment.isPaid ? "#059669" : "#000000",
    paidBackground: payment.isPaid ? "#ecfdf5" : "transparent",
    pendingColor: payment.isPending ? "#e11d48" : "#000000",
    pendingBackground: payment.isPending ? "#fff1f2" : "transparent",
  };
}
