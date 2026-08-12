export function textOnly(value: string): string {
  return value.replace(/[^A-Za-z\u00C0-\u024F\s]/g, "");
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isTextOnly(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized === "" || /^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/.test(normalized);
}

export function isDigitsOnly(value: string): boolean {
  const normalized = value.trim();
  return normalized === "" || /^\d+$/.test(normalized);
}
