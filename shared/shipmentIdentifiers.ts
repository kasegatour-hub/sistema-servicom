const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Identificador numérico para nuevos envíos: exactamente 8 dígitos. */
export function generateShipmentOrderNumber(random = Math.random): string {
  return Math.floor(10_000_000 + random() * 90_000_000).toString();
}

/** Código corto para nuevos envíos: un dígito seguido de tres letras mayúsculas. */
export function generateShipmentCode(random = Math.random): string {
  const digit = Math.floor(random() * 10).toString();
  let letters = "";
  for (let index = 0; index < 3; index += 1) {
    letters += CODE_LETTERS[Math.floor(random() * CODE_LETTERS.length)];
  }
  return `${digit}${letters}`;
}

export function isNewShipmentOrderNumber(value: string): boolean {
  return /^\d{8}$/.test(value.trim());
}

export function isNewShipmentCode(value: string): boolean {
  return /^\d[A-Z]{3}$/.test(value.trim().toUpperCase());
}

export const SHIPMENT_ORDER_HELP = "8 dígitos, sin espacios";
export const SHIPMENT_CODE_HELP = "1 dígito y 3 letras";
export const SHIPMENT_CODE_EXAMPLE = "7ABC";
