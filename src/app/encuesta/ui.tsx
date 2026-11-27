"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type Score = { estado: "valor" | "NO" | "NA" | null; nivel: number | null; evidencia: string };

const base =
  "w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition placeholder:text-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20";
const borde = (e?: string) => (e ? "border-[#c2410c]" : "border-mist");

export function Campo({ etiqueta, ayuda, error, children, className = "" }: { etiqueta: string; ayuda?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={`block text-sm font-medium text-ink/80 ${ayuda ? "" : "mb-1.5"}`}>{etiqueta}</span>
      {ayuda && <span className="mb-1.5 mt-0.5 block text-xs leading-relaxed text-ink/50">{ayuda}</span>}
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

/** Opción de respuesta como tarjeta con el texto completo (nivel de un criterio u opción de O4). */
export function OpcionTarjeta({ marca, titulo, texto, activa, onClick }: {
  marca: string;
  titulo?: string;
  texto: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[.99] ${
        activa ? "border-primary bg-[#eaf1f7] ring-1 ring-primary" : "border-mist bg-white hover:border-accent"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors ${
          activa ? "bg-primary text-white" : "bg-mist text-ink"
        }`}
      >
        {marca}
      </span>
      <span className="block">
        {titulo && <span className="block text-sm font-semibold text-ink">{titulo}</span>}
        <span className={`block text-[15px] leading-relaxed text-ink/85 ${titulo ? "mt-0.5" : ""}`}>{texto}</span>
      </span>
    </button>
  );
}

/** Texto opcional plegado (evidencia o descripción): se abre a petición. */
export function Plegable({ etiqueta, valor, onChange, abierto, onAbrir }: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  abierto: boolean;
  onAbrir: () => void;
}) {
  if (!abierto && !valor)
    return (
      <button type="button" onClick={onAbrir} className="text-sm font-medium text-accent underline-offset-2 hover:underline">
        + {etiqueta}
      </button>
    );
  return (
    <div className="animate-[entrada_.2s_ease-out]">
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{etiqueta}</span>
      <Area valor={valor} onChange={onChange} filas={3} autoFocus={abierto && !valor} />
    </div>
  );
}

/** Lienzo de firma: dibuja con puntero (dedo, lápiz o mouse) y entrega un PNG en base64. */
export function FirmaPad({ valor, onChange, error }: { valor: string; onChange: (v: string) => void; error?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);

  // Repinta la firma guardada (por ejemplo, al recuperar el borrador).
  useEffect(() => {
    const c = ref.current;
    if (!c || !valor) return;
    const img = new window.Image();
    img.onload = () => c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    img.src = valor;
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const inicio = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    c.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#094875";
    const p = punto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  };
  const mueve = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const fin = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };
  const borrar = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  return (
    <div>
      <div className={`relative overflow-hidden rounded-xl border bg-white ${error ? "border-[#c2410c]" : "border-mist"}`}>
        <canvas
          ref={ref}
          width={720}
          height={260}
          aria-label="Firma"
          onPointerDown={inicio}
          onPointerMove={mueve}
          onPointerUp={fin}
          onPointerCancel={fin}
          className="block h-40 w-full cursor-crosshair touch-none"
        />
        {!valor && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink/30">Firme aquí</span>}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-t border-dashed border-mist" />
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <Aviso texto={error} />
        {valor && (
          <button type="button" onClick={borrar} className="ml-auto text-sm text-accent underline-offset-2 hover:underline">
            Borrar
          </button>
        )}
      </div>
    </div>
  );
}
