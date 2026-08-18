export const IDENTITY_DOCUMENT_TYPES = ["dni_peru", "pasaporte", "carta_identita_italia"] as const;
export type IdentityDocumentType = typeof IDENTITY_DOCUMENT_TYPES[number];

export const IDENTITY_DOCUMENT_DEFINITIONS: Record<IdentityDocumentType, {
  label: string;
  placeholder: string;
  helpText: string;
  maxLength: number;
  inputMode: "numeric" | "text";
}> = {
  dni_peru: {
    label: "DNI peruano",
    placeholder: "Ej: 71234567",
    helpText: "Solo 8 dígitos numéricos.",
    maxLength: 8,
    inputMode: "numeric",
  },
  pasaporte: {
    label: "Pasaporte",
    placeholder: "Ej: AB1234567",
    helpText: "De 6 a 9 caracteres alfanuméricos, sin espacios.",
    maxLength: 9,
    inputMode: "text",
  },
  carta_identita_italia: {
    label: "Carta d’identità italiana (CIE)",
    placeholder: "Ej: CA12345AB",
    helpText: "2 letras, 5 números y 2 letras (9 caracteres).",
    maxLength: 9,
    inputMode: "text",
  },
};

export function normalizeIdentityDocument(value: string, type: IdentityDocumentType): string {
  const compact = value.replace(/\s/g, "").toUpperCase();
  if (type === "dni_peru") return compact.replace(/\D/g, "").slice(0, 8);
  return compact.replace(/[^A-Z0-9]/g, "").slice(0, IDENTITY_DOCUMENT_DEFINITIONS[type].maxLength);
}

export function isValidIdentityDocument(value: string, type: IdentityDocumentType): boolean {
  const raw = value.trim().toUpperCase();
  if (type === "dni_peru") return /^\d{8}$/.test(raw);
  if (type === "pasaporte") return /^[A-Z0-9]{6,9}$/.test(raw);
  return /^[A-Z]{2}\d{5}[A-Z]{2}$/.test(raw);
}

export function getIdentityDocumentError(type: IdentityDocumentType): string {
  if (type === "dni_peru") return "El DNI peruano debe contener exactamente 8 dígitos.";
  if (type === "pasaporte") return "El pasaporte debe contener entre 6 y 9 caracteres alfanuméricos, sin espacios.";
  return "La carta d’identità italiana debe tener el formato AA12345BB: 2 letras, 5 números y 2 letras.";
}
