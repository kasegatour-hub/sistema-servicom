export function textOnly(value: string): string {
  return value.replace(/[^A-Za-z\u00C0-\u024F\s]/g, "");
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isTextOnly(value: string): boolean {
  return value === "" || /^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/.test(value);
}

export function isDigitsOnly(value: string): boolean {
  return value === "" || /^\d+$/.test(value);
}
