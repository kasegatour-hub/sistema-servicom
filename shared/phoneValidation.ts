export type PhoneLengthRule = {
  countryCode: string;
  min: number;
  max: number;
};

export const PHONE_LENGTH_RULES: PhoneLengthRule[] = [
  { countryCode: "+591", min: 8, max: 8 },
  { countryCode: "+599", min: 7, max: 7 },
  { countryCode: "+593", min: 9, max: 9 },
  { countryCode: "+387", min: 8, max: 9 },
  { countryCode: "+964", min: 10, max: 10 },
  { countryCode: "+353", min: 9, max: 10 },
  { countryCode: "+51", min: 9, max: 9 },
  { countryCode: "+39", min: 10, max: 10 },
  { countryCode: "+34", min: 9, max: 9 },
  { countryCode: "+1", min: 10, max: 10 },
  { countryCode: "+54", min: 10, max: 10 },
  { countryCode: "+57", min: 10, max: 10 },
  { countryCode: "+56", min: 9, max: 9 },
  { countryCode: "+55", min: 10, max: 11 },
  { countryCode: "+52", min: 10, max: 10 },
  { countryCode: "+58", min: 10, max: 10 },
  { countryCode: "+91", min: 10, max: 10 },
  { countryCode: "+62", min: 9, max: 12 },
  { countryCode: "+98", min: 10, max: 10 },
  { countryCode: "+44", min: 10, max: 10 },
  { countryCode: "+33", min: 9, max: 9 },
  { countryCode: "+49", min: 10, max: 11 },
];

const sortedRules = [...PHONE_LENGTH_RULES].sort((left, right) => right.countryCode.length - left.countryCode.length);

export function splitInternationalPhone(value?: string | null) {
  const normalized = String(value ?? "").trim().replace(/[\s()-]/g, "");
  const international = normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized;
  const rule = sortedRules.find(candidate => international.startsWith(candidate.countryCode));
  return {
    countryCode: rule?.countryCode || "",
    localNumber: (rule ? international.slice(rule.countryCode.length) : international.replace(/^\+/, "")).replace(/\D/g, ""),
    rule,
  };
}

export function getPhoneValidationError(value?: string | null): string | null {
  const { countryCode, localNumber, rule } = splitInternationalPhone(value);
  if (!value?.trim()) return null;
  if (!countryCode || !rule) return "Selecciona un código de país válido.";
  if (localNumber.length < rule.min || localNumber.length > rule.max) {
    const expected = rule.min === rule.max ? `${rule.min}` : `entre ${rule.min} y ${rule.max}`;
    return `El número para ${countryCode} debe tener ${expected} dígitos locales.`;
  }
  return null;
}

export function isValidInternationalPhone(value?: string | null) {
  return getPhoneValidationError(value) === null;
}
