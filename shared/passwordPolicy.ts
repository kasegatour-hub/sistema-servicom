export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_REQUIREMENTS_MESSAGE = "Para crear una contraseña segura, usa al menos 12 caracteres. Mezcla letras mayúsculas y minúsculas, números y símbolos.";

export type PasswordRequirement = {
  id: "length" | "uppercase" | "lowercase" | "number" | "symbol";
  label: string;
  met: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: "length", label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: "uppercase", label: "Una letra mayúscula", met: /[A-Z]/.test(password) },
    { id: "lowercase", label: "Una letra minúscula", met: /[a-z]/.test(password) },
    { id: "number", label: "Un número", met: /\d/.test(password) },
    { id: "symbol", label: "Un símbolo", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isSecurePassword(password: string): boolean {
  return getPasswordRequirements(password).every(requirement => requirement.met);
}
