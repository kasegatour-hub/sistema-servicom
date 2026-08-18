import { z } from "zod";

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
