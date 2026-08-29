const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LEGACY_ORDER_NUMBER_PATTERN = /^\d{8}$/;
const MONTHLY_PARCEL_ORDER_PATTERN = /^\d{4}-\d{4}$/;

export const TRACKING_ORDER_MAX_DIGITS = 8;
export const TRACKING_ORDER_MAX_INPUT_LENGTH = 32;
export const TRACKING_CODE_MAX_LENGTH = 32;

/** Generador legado de identificadores numéricos de ocho dígitos, conservado para compatibilidad histórica. */
export function generateShipmentOrderNumber(random = Math.random): string {
  return Math.floor(10_000_000 + random() * 90_000_000).toString();
}

/** Prefijo mensual de órdenes de encomienda: mes y año, por ejemplo 0826. */
export function getMonthlyParcelOrderPrefix(date = new Date()): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getFullYear()).slice(-2)}`;
}

/**
 * Orden única de documento o encomienda con el formato MMAA-XXXX.
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

  throw new Error(`Se agotaron las órdenes mensuales disponibles para ${input.isProvinceDelivery ? "envíos a provincia" : "envíos de sede"}.`);
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

/** Formatea el orden mensual durante la escritura y limita la entrada a 8 dígitos + guion. */
export function formatTrackingOrderInput(value: string): string {
  const compact = value.toUpperCase().replace(/\s/g, "");
  if (/^\d{0,8}$/.test(compact)) {
    if (compact.length <= 4) return compact;
    return `${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
  }
  return compact.slice(0, TRACKING_ORDER_MAX_INPUT_LENGTH);
}

/** Normaliza el código sin eliminar caracteres inválidos para que la validación pueda señalarlos. */
export function formatTrackingCodeInput(value: string): string {
  return value.toUpperCase().replace(/\s/g, "").slice(0, TRACKING_CODE_MAX_LENGTH);
}

export function getTrackingOrderError(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return "Escribe tu número de orden.";
  if (!/^[0-9-]{1,32}$/.test(normalized)) return "El número de orden solo admite dígitos y guiones.";
  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < TRACKING_ORDER_MAX_DIGITS) return `Al número de orden le faltan ${TRACKING_ORDER_MAX_DIGITS - digitCount} dígitos.`;
  return null;
}

export function getTrackingCodeError(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return "Escribe tu código de envío.";
  if (normalized.length > TRACKING_CODE_MAX_LENGTH || !/^[0-9A-Z-]+$/.test(normalized)) return "El código contiene caracteres no permitidos o es demasiado largo.";
  if (normalized.length <= 4) {
    if (!/^\d/.test(normalized)) return "Al código le falta el dígito inicial.";
    const letters = normalized.slice(1).replace(/[^A-Z]/g, "").length;
    if (letters < 3) return `Al código le faltan ${3 - letters} letras después del dígito.`;
    if (!/^\d[A-Z]{3}$/.test(normalized)) return "El código nuevo debe tener 1 dígito y 3 letras, por ejemplo 7ABC.";
  }
  return null;
}

export function isNewShipmentOrderNumber(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return LEGACY_ORDER_NUMBER_PATTERN.test(normalized) || MONTHLY_PARCEL_ORDER_PATTERN.test(normalized);
}

export function isNewShipmentCode(value: string): boolean {
  return /^\d[A-Z]{3}$/.test(value.trim().toUpperCase());
}

export const SHIPMENT_ORDER_HELP = "MMAA-XXXX para nuevos documentos y encomiendas; 8 dígitos para órdenes históricas";
export const SHIPMENT_CODE_HELP = "1 dígito y 3 letras";
export const SHIPMENT_CODE_EXAMPLE = "7ABC";
