import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, formatLocalPhoneInput, formatPhoneNumber, splitPhoneNumber } from "@/lib/phoneFormatting";

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export function PhoneInput({ value, onChange, placeholder = "970 188 447", required = false, id, className = "" }: PhoneInputProps) {
  const initialParts = splitPhoneNumber(value);
  const initialCountry = COUNTRY_CODES.find(country => country.code === initialParts.countryCode) || COUNTRY_CODES[0];
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [phoneNumber, setPhoneNumber] = useState(formatLocalPhoneInput(initialParts.localNumber));
  const onChangeRef = useRef(onChange);
  const lastExternalValue = useRef(value);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    const parts = splitPhoneNumber(value);
    const nextCountry = COUNTRY_CODES.find(country => country.code === parts.countryCode) || COUNTRY_CODES[0];
    setSelectedCountry(nextCountry);
    setPhoneNumber(formatLocalPhoneInput(parts.localNumber));
  }, [value]);

  useEffect(() => {
    const normalizedValue = phoneNumber.trim()
      ? formatPhoneNumber(`${selectedCountry.code} ${phoneNumber}`)
      : "";
    lastExternalValue.current = normalizedValue;
    onChangeRef.current(normalizedValue);
  }, [selectedCountry, phoneNumber]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) || country.code.includes(searchQuery),
  );

  return (
    <div className={`relative flex items-center gap-2 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-label={`Seleccionar país, ${selectedCountry.name}`}
        className="flex h-12 shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span>{selectedCountry.flag}</span>
        <span>{selectedCountry.code}</span>
        <span className="text-xs text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-13 z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              placeholder="Buscar país o código..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="mt-1 space-y-0.5">
            {filteredCountries.map(country => (
              <button
                type="button"
                key={country.code + country.name}
                onClick={() => {
                  setSelectedCountry(country);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${selectedCountry.code === country.code && selectedCountry.name === country.name ? "bg-blue-50 font-semibold text-primary" : "text-slate-700"}`}
              >
                <span className="flex items-center gap-2"><span>{country.flag}</span><span>{country.name}</span></span>
                <span className="font-mono text-xs text-slate-500">{country.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={formatLocalPhoneInput(phoneNumber)}
        onFocus={event => event.currentTarget.select()}
        onChange={event => setPhoneNumber(formatLocalPhoneInput(event.target.value))}
        required={required}
        aria-label="Número de teléfono"
        className="h-12 flex-1 bg-white text-base tracking-wide"
      />
    </div>
  );
}
