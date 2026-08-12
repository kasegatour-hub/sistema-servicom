import { describe, expect, it } from "vitest";
import { dniSchema, optionalDniSchema, optionalPersonNameSchema, personNameSchema } from "./inputValidation";

describe("input validation", () => {
  it("accepts names with letters, accents and spaces", () => {
    expect(personNameSchema.parse("María José")).toBe("María José");
    expect(personNameSchema.parse("Ángela Núñez")).toBe("Ángela Núñez");
  });

  it("rejects names containing numbers or symbols", () => {
    expect(() => personNameSchema.parse("Juan2")).toThrow("Solo se permiten letras y espacios");
    expect(() => personNameSchema.parse("Ana-Luisa")).toThrow("Solo se permiten letras y espacios");
  });

  it("accepts numeric DNI values and rejects letters", () => {
    expect(dniSchema.parse("71234567")).toBe("71234567");
    expect(() => dniSchema.parse("7123456A")).toThrow("El DNI solo puede contener números");
  });

  it("trims valid optional identity values before persistence", () => {
    expect(optionalPersonNameSchema.parse("  María José  ")).toBe("María José");
    expect(optionalDniSchema.parse(" 71234567 ")).toBe("71234567");
  });

  it("allows blank optional identity fields but rejects invalid values", () => {
    expect(optionalPersonNameSchema.parse("")).toBe("");
    expect(optionalDniSchema.parse("")).toBe("");
    expect(() => optionalPersonNameSchema.parse("Nombre3")).toThrow("Solo se permiten letras y espacios");
    expect(() => optionalDniSchema.parse("1234ABCD")).toThrow("El DNI solo puede contener números");
  });
});
