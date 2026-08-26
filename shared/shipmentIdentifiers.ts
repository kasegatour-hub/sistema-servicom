const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LEGACY_ORDER_NUMBER_PATTERN = /^\d{8}$/;
const MONTHLY_PARCEL_ORDER_PATTERN = /^\d{4}-\d{4}$/;

/** Identificador numérico para nuevos envíos: exactamente 8 dígitos. */
export function generateShipmentOrderNumber(random = Math.random): string {
  return Math.floor(10_000_000 + random() * 90_000_000).toString();
}

/** Prefijo mensual de órdenes de encomienda: mes y año, por ejemplo 0826. */
export function getMonthlyParcelOrderPrefix(date = new Date()): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getFullYear()).slice(-2)}`;
}

/**
 * Orden única de encomienda con el formato MMAA-XXXX.
 * Los dos últimos dígitos son el rango operativo: 01–20 para sede Lima y 01–14 para provincia.
 * Los dos dígitos anteriores permiten hasta 100 series mensuales sin reutilizar una orden.
 */
export function generateMonthlyParcelOrderNumber(input: {
  existingOrderNumbers: Iterable<string>;
  isProvinceDelivery: boolean;
  date?: Date;
}): string {
  const prefix = getMonthlyParcelOrderPrefix(input.date);
  const usedOrders = new Set(Array.from(input.existingOrderNumbers, order => order.trim().toUpperCase()));
  const finalRangeLimit = input.isProvinceDelivery ? 14 : 20;

  for (let series = 0; series <= 99; series += 1) {
    for (let rangeValue = 1; rangeValue <= finalRangeLimit; rangeValue += 1) {
      const candidate = `${prefix}-${String(series).padStart(2, "0")}${String(rangeValue).padStart(2, "0")}`;
      if (!usedOrders.has(candidate)) return candidate;
    }
  }

  throw new Error(`Se agotaron las órdenes mensuales disponibles para ${input.isProvinceDelivery ? "encomiendas a provincia" : "encomiendas de sede"}.`);
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
  const normalized = value.trim().toUpperCase();
  return LEGACY_ORDER_NUMBER_PATTERN.test(normalized) || MONTHLY_PARCEL_ORDER_PATTERN.test(normalized);
}

export function isNewShipmentCode(value: string): boolean {
  return /^\d[A-Z]{3}$/.test(value.trim().toUpperCase());
}

export const SHIPMENT_ORDER_HELP = "8 dígitos sin espacios, o MMAA-XXXX para encomiendas";
export const SHIPMENT_CODE_HELP = "1 dígito y 3 letras";
export const SHIPMENT_CODE_EXAMPLE = "7ABC";
