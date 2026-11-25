"use client";

import { useState, type ReactNode } from "react";
import { NIVELES, type Criterio } from "@/lib/instrumento";

export type Score = { estado: "valor" | "NO" | "NA" | null; nivel: number | null; evidencia: string };

const base =
  "w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition placeholder:text-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20";
const borde = (e?: string) => (e ? "border-[#c2410c]" : "border-mist");

export function Campo({ etiqueta, error, children, className = "" }: { etiqueta: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{etiqueta}</span>
      {children}
      <Aviso texto={error} />
    </label>
  );
}

export function Aviso({ texto }: { texto?: string }) {
  return (
    <span
      role={texto ? "alert" : undefined}
      className={`flex items-center gap-1 overflow-hidden text-sm text-[#c2410c] transition-all duration-200 ${texto ? "mt-1.5 max-h-8 opacity-100" : "max-h-0 opacity-0"}`}
    >
      {texto && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5m0 3h.01" />
        </svg>
      )}
      {texto}
    </span>
  );
}

export function Texto({ valor, onChange, error, ...p }: { valor: string; onChange: (v: string) => void; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return <input {...p} value={valor} onChange={(e) => onChange(e.target.value)} className={`${base} ${borde(error)} h-12`} />;
}

export function Area({ valor, onChange, error, filas = 3, ...p }: { valor: string; onChange: (v: string) => void; error?: string; filas?: number } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">) {
  return <textarea {...p} rows={filas} value={valor} onChange={(e) => onChange(e.target.value)} className={`${base} ${borde(error)} resize-y py-2.5`} />;
}

export function Chips({ opciones, valor, onChange, multiple = false, error }: {
  opciones: readonly string[];
  valor: string | string[];
  onChange: (v: string) => void;
  multiple?: boolean;
  error?: string;
}) {
  const activo = (o: string) => (multiple ? (valor as string[]).includes(o) : valor === o);
  return (
    <div>
      <div role={multiple ? "group" : "radiogroup"} className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={activo(o)}
            onClick={() => onChange(o)}
            className={`min-h-11 rounded-xl border px-4 py-2 text-left text-sm transition active:scale-[.97] ${
              activo(o) ? "border-primary bg-primary text-white" : `${borde(error)} bg-white text-ink hover:border-accent`
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <Aviso texto={error} />
    </div>
  );
}

const TECHO = ["bg-[#c3d2de]", "bg-[#8fb0c9]", "bg-[#0471a3]", "bg-[#094875]"];

export function TarjetaCriterio({ c, valor, onChange, error }: {
  c: Criterio;
  valor: Score;
  onChange: (s: Score) => void;
  error?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const activo = hover ?? (valor.estado === "valor" ? valor.nivel : null);
  const completado = valor.estado !== null;

  return (
    <section className={`rounded-2xl border bg-white p-4 transition-colors sm:p-5 ${error ? "border-[#c2410c]" : completado ? "border-primary/40" : "border-mist"}`}>
      <header className="mb-3 flex items-start gap-3">
        <span className={`mt-0.5 flex h-7 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${completado ? "bg-primary text-white" : "bg-mist text-ink"}`}>
          {completado ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
          ) : (
            c.id
          )}
        </span>
        <h3 className="text-base font-medium leading-snug text-ink">{c.nombre}</h3>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NIVELES.map((n, i) => {
          const sel = valor.estado === "valor" && valor.nivel === i + 1;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={sel}
              onClick={() => onChange({ ...valor, estado: "valor", nivel: i + 1 })}
              onMouseEnter={() => setHover(i + 1)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i + 1)}
              onBlur={() => setHover(null)}
              className={`flex min-h-16 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition active:scale-[.97] ${
                sel ? "border-primary bg-primary text-white" : "border-mist bg-white text-ink hover:border-accent"
              }`}
            >
              <span className="text-xl font-semibold leading-none">{i + 1}</span>
              <span className={`mt-1 text-xs ${sel ? "text-white/80" : "text-ink/60"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div
        className={`grid transition-all duration-300 ${activo ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        aria-live="polite"
      >
        <div className="overflow-hidden">
          {activo && (
            <p className="flex gap-3 rounded-xl bg-mist/50 p-3 text-sm leading-relaxed text-ink/90">
              <span className={`mt-1 h-auto w-1 shrink-0 rounded-full ${TECHO[activo - 1]}`} />
              {c.niveles[activo - 1]}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {(c.na ? (["NO", "NA"] as const) : (["NO"] as const)).map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={valor.estado === e}
            title={e === "NO" ? "Falta evidencia" : "No aplica"}
            onClick={() => onChange({ ...valor, estado: e, nivel: null })}
            className={`h-10 min-w-14 rounded-lg border px-3 text-sm font-medium transition active:scale-[.97] ${
              valor.estado === e ? "border-ink bg-ink text-white" : "border-mist bg-white text-ink/70 hover:border-ink/40"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <Aviso texto={error} />

      <textarea
        rows={2}
        placeholder="Evidencia y justificación"
        value={valor.evidencia}
        onChange={(e) => onChange({ ...valor, evidencia: e.target.value })}
        className={`${base} border-mist mt-3 resize-y py-2.5 text-sm`}
      />
    </section>
  );
}
