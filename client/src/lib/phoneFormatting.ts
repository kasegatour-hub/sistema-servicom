export type PhoneParts = {
  countryCode: string;
  localNumber: string;
};

export type CountryCodeOption = {
  name: string;
  code: string;
  flag: string;
  example: string;
};

export const COUNTRY_CODES: CountryCodeOption[] = [
  { name: "Perú", code: "+51", flag: "🇵🇪", example: "970 188 447" },
  { name: "Italia", code: "+39", flag: "🇮🇹", example: "351 278 7962" },
  { name: "España", code: "+34", flag: "🇪🇸", example: "612 345 678" },
  { name: "Estados Unidos", code: "+1", flag: "🇺🇸", example: "202 555 0123" },
  { name: "Argentina", code: "+54", flag: "🇦🇷", example: "112 345 6789" },
  { name: "Colombia", code: "+57", flag: "🇨🇴", example: "300 123 4567" },
  { name: "Chile", code: "+56", flag: "🇨🇱", example: "912 345 678" },
  { name: "Bolivia", code: "+591", flag: "🇧🇴", example: "712 345 67" },
  { name: "Brasil", code: "+55", flag: "🇧🇷", example: "119 1234 5678" },
  { name: "Ecuador", code: "+593", flag: "🇪🇨", example: "991 234 567" },
  { name: "México", code: "+52", flag: "🇲🇽", example: "551 234 5678" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪", example: "412 123 4567" },
  { name: "Caribe Neerlandés", code: "+599", flag: "🌐", example: "912 3456" },
  { name: "Bosnia y Herzegovina", code: "+387", flag: "🇧🇦", example: "611 234 56" },
  { name: "India", code: "+91", flag: "🇮🇳", example: "987 654 3210" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩", example: "812 3456 7890" },
  { name: "Irak", code: "+964", flag: "🇮🇶", example: "770 123 4567" },
  { name: "Irán", code: "+98", flag: "🇮🇷", example: "912 123 4567" },
  { name: "Irlanda", code: "+353", flag: "🇮🇪", example: "851 234 567" },
  { name: "Reino Unido", code: "+44", flag: "🇬🇧", example: "770 090 0123" },
  { name: "Francia", code: "+33", flag: "🇫🇷", example: "612 345 678" },
  { name: "Alemania", code: "+49", flag: "🇩🇪", example: "151 234 56789" },
];

const sortedCodes = [...COUNTRY_CODES].sort((left, right) => right.code.length - left.code.length);

export function splitPhoneNumber(value?: string | null): PhoneParts {
  const compact = String(value ?? "").trim().replace(/[^\d+]/g, "");
  const international = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  const country = sortedCodes.find(({ code }) => international.startsWith(code) || international.startsWith(code.replace("+", "")));
  if (!country) {
    const localDigits = international.replace(/^\+/, "");
    if (/^9\d{8}$/.test(localDigits)) return { countryCode: "+51", localNumber: localDigits };
    return { countryCode: "", localNumber: localDigits };
  }
  const compactCode = country.code.replace("+", "");
  const localNumber = international.startsWith(country.code)
    ? international.slice(country.code.length)
    : international.slice(compactCode.length);
  return { countryCode: country.code, localNumber: localNumber.replace(/\D/g, "") };
}

export function groupPhoneDigits(value?: string | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`.trim();
}

export function formatPhoneNumber(value?: string | null): string {
  const { countryCode, localNumber } = splitPhoneNumber(value);
  const groupedLocal = groupPhoneDigits(localNumber);
  if (!countryCode) return groupedLocal;
  return groupedLocal ? `${countryCode} ${groupedLocal}` : countryCode;
}

export function formatLocalPhoneInput(value?: string | null): string {
  return groupPhoneDigits(value);
}
