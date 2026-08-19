import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { getPasswordRequirements, PASSWORD_REQUIREMENTS_MESSAGE } from "@shared/passwordPolicy";

export function PasswordRequirements({ password, className = "" }: { password: string; className?: string }) {
  const requirements = getPasswordRequirements(password);
  return (
    <div className={`mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 ${className}`.trim()} aria-live="polite">
      <p className="font-medium text-slate-700">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
      <ul aria-label="Requisitos de contraseña" className="mt-1 grid gap-1 sm:grid-cols-2">
        {requirements.map(requirement => (
          <li key={requirement.id} className={requirement.met ? "flex items-center gap-1 text-emerald-700" : "flex items-center gap-1 text-slate-500"}>
            {requirement.met ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
            {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
