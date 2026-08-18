export const SERVICOM_BRAND = {
  navy: "#0B2B5E",
  blue: "#006CB7",
  orange: "#F28C00",
  light: "#FFFFFF",
} as const;

export function normalizeTrackingValue(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function buildTrackingPath(orderNumber: string, code: string): string {
  const order = normalizeTrackingValue(orderNumber);
  const normalizedCode = normalizeTrackingValue(code);
  return `/?order=${encodeURIComponent(order)}&code=${encodeURIComponent(normalizedCode)}`;
}

export function buildTrackingUrl(orderNumber: string, code: string, origin = window.location.origin): string {
  return new URL(buildTrackingPath(orderNumber, code), origin).toString();
}

export function buildShipmentManagementPath(orderNumber: string, code: string): string {
  const order = normalizeTrackingValue(orderNumber);
  const normalizedCode = normalizeTrackingValue(code);
  return `/admin?order=${encodeURIComponent(order)}&code=${encodeURIComponent(normalizedCode)}&open=update`;
}

export function buildShipmentManagementUrl(orderNumber: string, code: string, origin = window.location.origin): string {
  return new URL(buildShipmentManagementPath(orderNumber, code), origin).toString();
}

export const TRACKING_QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "M" as const,
  color: {
    dark: SERVICOM_BRAND.navy,
    light: SERVICOM_BRAND.light,
  },
} as const;
