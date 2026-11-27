"use client";

import { useEffect, useRef, useState } from "react";

const CLAVE = "upd-i03-codigo";

/** Botón "Exportar PDF": pide el código de acceso y descarga el PDF de todas las encuestas filtradas. */
export function ExportarPdf({ qs }: { qs: string }) {
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [bajando, setBajando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) entrada.current?.focus();
  }, [abierto]);

  const descargar = async (c: string): Promise<boolean> => {
    setBajando(true);
    setError("");
    try {
      const r = await fetch(`/api/pdf${qs ? `?${qs}` : ""}`, { headers: { "x-clave": c } });
      if (r.status === 401) return setError("Código incorrecto"), false;
      if (r.status === 429) return setError("Demasiados intentos, espera unos minutos"), false;
      if (!r.ok) return setError("No se pudo generar el PDF"), false;
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: "encuestas-i03-upd.pdf" });
      a.click();
      URL.revokeObjectURL(url);
      try { sessionStorage.setItem(CLAVE, c); } catch {}
      setAbierto(false);
      return true;
    } catch {
      setError("Sin conexión");
      return false;
    } finally {
      setBajando(false);
    }
  };

  const abrir = () => {
    let guardado = "";
    try { guardado = sessionStorage.getItem(CLAVE) ?? ""; } catch {}
    if (!guardado) return setAbierto(true);
    // Si el código guardado ya no sirve, se vuelve a pedir.
    void descargar(guardado).then((ok) => {
      if (!ok) {
        try { sessionStorage.removeItem(CLAVE); } catch {}
        setAbierto(true);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary bg-white px-4 text-sm font-medium text-primary transition hover:bg-mist/50 active:scale-[.98]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
        </svg>
        Exportar PDF
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => setAbierto(false)}
          role="presentation"
        >
          <form
            role="dialog"
            aria-label="Código de acceso"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (codigo.trim()) void descargar(codigo.trim());
            }}
            className="w-full max-w-sm animate-[entrada_.2s_ease-out] space-y-3 rounded-2xl bg-white p-5 shadow-xl"
          >
            <label className="block text-sm font-medium text-ink/80" htmlFor="codigo-pdf">Código de acceso</label>
            <input
              id="codigo-pdf"
              ref={entrada}
              type="password"
              autoComplete="off"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value); setError(""); }}
              className={`h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${error ? "border-[#c2410c]" : "border-mist"}`}
            />
            <p role={error ? "alert" : undefined} className={`text-sm text-[#c2410c] transition-opacity ${error ? "opacity-100" : "opacity-0"}`}>
              {error || "."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-xl border border-mist px-4 text-sm font-medium text-ink transition hover:border-ink/30">
                Cancelar
              </button>
              <button type="submit" disabled={bajando || !codigo.trim()} className="h-11 flex-1 rounded-xl bg-primary text-sm font-medium text-white transition hover:bg-primary-dark active:scale-[.98] disabled:opacity-50">
                {bajando ? "Generando…" : "Descargar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
