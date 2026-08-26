export const TRANSFER_CURRENCIES = ["EUR", "PEN"] as const;
export type TransferCurrency = typeof TRANSFER_CURRENCIES[number];

export function getTransferCommissionPercent(sourceCurrency: TransferCurrency, destinationCurrency: TransferCurrency) {
  if (sourceCurrency === "EUR" && destinationCurrency === "EUR") return 3;
  if (sourceCurrency === "PEN" && destinationCurrency === "EUR") return 2;
  return 0;
}

export function calculateTransferFee(amountSent: number, commissionPercent: number) {
  return Math.max(0, amountSent) * Math.max(0, commissionPercent) / 100;
}

export function calculateTransferAmount(amountSent: number, transferFee: number, exchangeRate: number, sourceCurrency: TransferCurrency, destinationCurrency: TransferCurrency) {
  const netAmount = Math.max(0, amountSent - transferFee);
  if (sourceCurrency === destinationCurrency) return netAmount;
  if (sourceCurrency === "PEN" && destinationCurrency === "EUR") return exchangeRate > 0 ? netAmount / exchangeRate : 0;
  if (sourceCurrency === "EUR" && destinationCurrency === "PEN") return netAmount * Math.max(0, exchangeRate);
  return netAmount;
}
