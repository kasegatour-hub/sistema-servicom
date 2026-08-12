import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

const COUNTRIES = [
  { name: "Perú", code: "+51", flag: "🇵🇪" },
  { name: "Italia", code: "+39", flag: "🇮🇹" },
  { name: "España", code: "+34", flag: "🇪🇸" },
  { name: "Estados Unidos", code: "+1", flag: "🇺🇸" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "Bolivia", code: "+591", flag: "🇧🇴" },
  { name: "Brasil", code: "+55", flag: "🇧🇷" },
  { name: "Ecuador", code: "+593", flag: "🇪🇨" },
  { name: "México", code: "+52", flag: "🇲🇽" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Bosnia y Herzegovina", code: "+387", flag: "🇧🇦" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Irak", code: "+964", flag: "🇮🇶" },
  { name: "Irán", code: "+98", flag: "🇮🇷" },
  { name: "Irlanda", code: "+353", flag: "🇮🇪" },
  { name: "Reino Unido", code: "+44", flag: "🇬🇧" },
  { name: "Francia", code: "+33", flag: "🇫🇷" },
  { name: "Alemania", code: "+49", flag: "🇩🇪" },
];

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export function PhoneInput({ value, onChange, placeholder = "970188447", required = false, id, className = "" }: PhoneInputProps) {
  // Separar prefijo y número inicial si existe
  const initialCountry = COUNTRIES.find(c => value.startsWith(c.code)) || COUNTRIES[0];
  const initialNumber = value.startsWith(initialCountry.code) ? value.slice(initialCountry.code.length).trim() : value;

  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const normalizedValue = phoneNumber.trim() ? `${selectedCountry.code} ${phoneNumber}`.trim() : "";
    onChange(normalizedValue);
  }, [onChange, selectedCountry, phoneNumber]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.includes(searchQuery)
  );

  return (
    <div className={`relative flex gap-2 items-center ${className}`} ref={dropdownRef}>
      {/* Botón selector de país */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary h-10 shrink-0"
      >
        <span>{selectedCountry.flag}</span>
        <span>{selectedCountry.code}</span>
        <span className="text-xs text-slate-400">▼</span>
      </button>

      {/* Menú desplegable con buscador estilo WhatsApp */}
      {isOpen && (
        <div className="absolute top-11 left-0 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder="Buscar país o código..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="mt-1 space-y-0.5">
            {filteredCountries.map(c => (
              <button
                type="button"
                key={c.code + c.name}
                onClick={() => {
                  setSelectedCountry(c);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg text-left hover:bg-slate-100 ${selectedCountry.code === c.code && selectedCountry.name === c.name ? 'bg-blue-50 font-semibold text-primary' : 'text-slate-700'}`}
              >
                <div className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </div>
                <span className="text-slate-500 font-mono text-xs">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input de número telefónico */}
      <Input
        id={id}
        type="tel"
        placeholder={placeholder}
        value={phoneNumber}
        onChange={e => setPhoneNumber(e.target.value)}
        required={required}
        className="bg-white flex-1"
      />
    </div>
  );
}
