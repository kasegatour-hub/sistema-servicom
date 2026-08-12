import { z } from "zod";

export const personNameSchema = z.string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .regex(/^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/, "Solo se permiten letras y espacios.");

export const dniSchema = z.string()
  .trim()
  .min(8, "El DNI debe tener al menos 8 dígitos.")
  .regex(/^\d+$/, "El DNI solo puede contener números.");

export const optionalPersonNameSchema = z.string()
  .trim()
  .refine(value => value === "" || /^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/.test(value), "Solo se permiten letras y espacios.")
  .optional();

export const optionalDniSchema = z.string()
  .trim()
  .refine(value => value === "" || /^\d+$/.test(value), "El DNI solo puede contener números.")
  .optional();
