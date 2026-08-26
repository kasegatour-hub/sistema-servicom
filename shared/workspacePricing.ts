const KASEGA_PRICING_EMAILS = new Set([
  "magda.barreto.alv@gmail.com",
  "kasegatour@gmail.com",
]);

const KASEGA_PRICING_ADMIN_IDS = new Set([210001, 210002]);

export const SERVICOM_PARCEL_RATE_EUR_PER_KG = 15;
export const KASEGA_PARCEL_RATE_EUR_PER_KG = 13;

export function isKasegaPricingWorkspace(input: { workspaceAdminId?: number | null; workspaceAdminEmail?: string | null }) {
  const email = String(input.workspaceAdminEmail ?? "").trim().toLowerCase();
  return KASEGA_PRICING_EMAILS.has(email) || KASEGA_PRICING_ADMIN_IDS.has(Number(input.workspaceAdminId));
}

export function getParcelRateEurPerKg(input: { workspaceAdminId?: number | null; workspaceAdminEmail?: string | null }) {
  return isKasegaPricingWorkspace(input) ? KASEGA_PARCEL_RATE_EUR_PER_KG : SERVICOM_PARCEL_RATE_EUR_PER_KG;
}
