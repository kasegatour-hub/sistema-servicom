export type PhoneParts = {
  countryCode: string;
  localNumber: string;
};

export const COUNTRY_CODES = [
  { name: "Perú", code: "+51", flag: "🇵🇪" },
  { name: "Italia", code: "+39", flag: "🇮🇹" },
  { name: "España", code: "+34", flag: "🇪🇸" },
  { name: "Estados Unidos", code: "+1", flag: "🇺🇸" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "Bolivia", code: "+591", flag: "🇧🇴" },
  { name: "Brasil", code: "+55", flag: "🇧🇷" },
  { name: "Ecuador", code: "+593", flag: "🇪🇨" },
  { name: "México", code: "+52", flag: "🇲🇽" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Caribe Neerlandés", code: "+599", flag: "🌐" },
  { name: "Bosnia y Herzegovina", code: "+387", flag: "🇧🇦" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Irak", code: "+964", flag: "🇮🇶" },
  { name: "Irán", code: "+98", flag: "🇮🇷" },
  { name: "Irlanda", code: "+353", flag: "🇮🇪" },
  { name: "Reino Unido", code: "+44", flag: "🇬🇧" },
  { name: "Francia", code: "+33", flag: "🇫🇷" },
  { name: "Alemania", code: "+49", flag: "🇩🇪" },
];

const sortedCodes = [...COUNTRY_CODES].sort((left, right) => right.code.length - left.code.length);

export function splitPhoneNumber(value?: string | null): PhoneParts {
  const compact = String(value ?? "").trim().replace(/[^\d+]/g, "");
  const international = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  const country = sortedCodes.find(({ code }) => international.startsWith(code) || international.startsWith(code.replace("+", "")));
  if (!country) return { countryCode: "", localNumber: international.replace(/^\+/, "") };
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
