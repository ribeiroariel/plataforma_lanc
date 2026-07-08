"use client";

import { useId, useState } from "react";

type Props = {
  name: string;
  label: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  value?: string;
  onChange?: (valor: string) => void;
};

export function CampoSenha({
  name,
  label,
  autoComplete = "current-password",
  minLength,
  required = true,
  value,
  onChange,
}: Props) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();

  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm text-ink">
      {label}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="w-full rounded border border-rule bg-paper-raised px-3 py-2 pr-10 text-ink focus:border-absorbance focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-soft hover:text-ink"
        >
          {visivel ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 3l18 18" strokeLinecap="round" />
              <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5.5 0 9 5 9 7-.4.8-1.3 2.1-2.7 3.3M6.7 6.7C4.6 8 3.4 9.9 3 12c0 2 3.5 7 9 7 1.2 0 2.3-.2 3.3-.6" strokeLinecap="round" />
              <path d="M9.5 10a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
