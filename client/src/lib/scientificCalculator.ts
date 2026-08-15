const ALLOWED_WORDS = new Set(["sin", "cos", "tan", "log", "ln", "sqrt", "abs", "pi", "e"]);

/** Evalúa una expresión matemática limitada: admite operaciones, paréntesis y funciones científicas básicas en radianes. */
export function evaluateScientificExpression(value: string): number {
  const expression = value.trim().replace(/×/g, "*").replace(/÷/g, "/");
  if (!expression) throw new Error("Ingresa una operación.");
  if (!/^[0-9+\-*/^().,\sA-Za-z]+$/.test(expression)) throw new Error("La expresión contiene caracteres no permitidos.");

  const words = expression.match(/[A-Za-z]+/g) || [];
  if (words.some(word => !ALLOWED_WORDS.has(word.toLowerCase()))) {
    throw new Error("Solo se admiten las funciones sin, cos, tan, log, ln, sqrt y abs.");
  }

  const normalized = expression
    .replace(/\^/g, "**")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/gi, "Math.E")
    .replace(/\bsin\s*\(/gi, "Math.sin(")
    .replace(/\bcos\s*\(/gi, "Math.cos(")
    .replace(/\btan\s*\(/gi, "Math.tan(")
    .replace(/\blog\s*\(/gi, "Math.log10(")
    .replace(/\bln\s*\(/gi, "Math.log(")
    .replace(/\bsqrt\s*\(/gi, "Math.sqrt(")
    .replace(/\babs\s*\(/gi, "Math.abs(");

  try {
    const result = Function("Math", `"use strict"; return (${normalized});`)(Math);
    if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("El resultado no es un número finito.");
    return result;
  } catch {
    throw new Error("No se pudo calcular la expresión.");
  }
}
