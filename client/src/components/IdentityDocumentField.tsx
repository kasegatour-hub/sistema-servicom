import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDENTITY_DOCUMENT_DEFINITIONS, IDENTITY_DOCUMENT_TYPES, type IdentityDocumentType, isValidIdentityDocument, normalizeIdentityDocument } from "@shared/identityDocuments";

type IdentityDocumentFieldProps = {
  id: string;
  label: string;
  documentType: IdentityDocumentType;
  onDocumentTypeChange: (value: IdentityDocumentType) => void;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
};

export function IdentityDocumentField({ id, label, documentType, onDocumentTypeChange, value, onValueChange, required, className, error = "" }: IdentityDocumentFieldProps) {
  const definition = IDENTITY_DOCUMENT_DEFINITIONS[documentType];
  return <div className={className}>
    <div className="flex items-center gap-1"><Label htmlFor={`${id}-number`}>{label}</Label>{required && <span className="text-rose-600" aria-hidden="true">*</span>}</div>
    <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2">
      <select id={`${id}-type`} aria-label={`${label} - tipo de identificación`} value={documentType} onChange={(event) => {
        const nextType = event.target.value as IdentityDocumentType;
        onDocumentTypeChange(nextType);
        const normalizedValue = normalizeIdentityDocument(value, nextType);
        onValueChange(normalizedValue && isValidIdentityDocument(normalizedValue, nextType) ? normalizedValue : "");
      }} className={`h-10 rounded-md border bg-white px-2 text-sm font-medium text-slate-700 ${error ? "border-rose-500 ring-1 ring-rose-200" : "border-slate-300"}`}>
        {IDENTITY_DOCUMENT_TYPES.map(type => <option key={type} value={type}>{IDENTITY_DOCUMENT_DEFINITIONS[type].label}</option>)}
      </select>
      <Input id={`${id}-number`} aria-label={`${label} - número de identificación`} value={value} onChange={(event) => onValueChange(normalizeIdentityDocument(event.target.value, documentType))} placeholder={definition.placeholder} inputMode={definition.inputMode} maxLength={definition.maxLength} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`bg-white ${error ? "border-rose-500 ring-1 ring-rose-200" : ""}`} />
    </div>
    <p className="mt-1 text-xs text-slate-500">{definition.helpText}</p>
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
  </div>;
}
