import { z } from "zod";
import { IDENTITY_DOCUMENT_TYPES, type IdentityDocumentType, getIdentityDocumentError, isValidIdentityDocument } from "../shared/identityDocuments";

export const personNameSchema = z.string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .regex(/^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/, "Solo se permiten letras y espacios.");

export const dniSchema = z.string()
  .trim()
  .min(8, "El DNI debe tener al menos 8 dígitos.")
  .max(8, "El DNI no puede tener más de 8 dígitos.")
  .regex(/^\d+$/, "El DNI solo puede contener números.");

export const optionalPersonNameSchema = z.string()
  .trim()
  .refine(value => value === "" || /^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/.test(value), "Solo se permiten letras y espacios.")
  .optional();

export const optionalDniSchema = z.string()
  .trim()
  .refine(value => value === "" || /^\d{1,8}$/.test(value), "El DNI solo puede contener números y no puede superar 8 dígitos.")
  .optional();

export const identityDocumentTypeSchema = z.enum(IDENTITY_DOCUMENT_TYPES);

export const identityDocumentNumberSchema = z.string()
  .trim()
  .min(1, "El número de identificación es obligatorio.")
  .max(9, "El documento no puede superar 9 caracteres.")
  .regex(/^[A-Za-z0-9]+$/, "El documento solo puede contener letras y números, sin espacios.");

export const optionalIdentityDocumentNumberSchema = z.string()
  .trim()
  .refine(value => value === "" || (/^[A-Za-z0-9]+$/.test(value) && value.length <= 9), "El documento solo puede contener letras y números, sin espacios, y no puede superar 9 caracteres.")
  .optional();

export type PersonValidationInput = {
  name?: string | null;
  lastName?: string | null;
  document?: string | null;
  phone?: string | null;
};

export function getIncompletePersonFields(person: PersonValidationInput): string[] {
  const fields: Array<[keyof PersonValidationInput, string]> = [["name", "nombre"], ["lastName", "apellido"]];
  const hasAny = fields.some(([key]) => Boolean(String(person[key] ?? "").trim()));
  return hasAny ? fields.filter(([key]) => !String(person[key] ?? "").trim()).map(([, label]) => label) : [];
}

export function isIdentityDocumentValid(value: string | undefined | null, type: IdentityDocumentType): boolean {
  return !value || isValidIdentityDocument(value, type);
}

export function identityDocumentValidationMessage(type: IdentityDocumentType) {
  return getIdentityDocumentError(type);
}
