"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Resultados } from "@/lib/resultados";
import { MODALIDADES, MOMENTOS } from "@/lib/criterios";
import {
  ClasificacionIes,
  Distribucion,
  Esqueleto,
  Evolucion,
  MapaCalor,
  Panel,
  PorCriterio,
  Promedios,
  Tarjetas,
  UsoIa,
  Vacio,
} from "./panels";

type Ies = { codigo: string; nombre: string };

const selectCls =
  "h-11 w-full rounded-xl border border-mist bg-white px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function ResultadosPage() {
  const [ies, setIes] = useState<Ies[]>([]);
  const [f, setF] = useState({ ies: "", momento: "", modalidad: "" });
  const [datos, setDatos] = useState<Resultados | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ies").then((r) => r.json()).then(setIes).catch(() => {});
  }, []);

  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/resultados${qs ? `?${qs}` : ""}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setDatos(d);
        setError(false);
        setCargando(false);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(true);
        setCargando(false);
      });
    return () => ctrl.abort();
  }, [qs]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCargando(true);
    setF({ ...f, [k]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[#f6f9fb]">
      <header className="border-b border-mist bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Image src="/logos/upd.svg" alt="UPD" width={150} height={48} className="h-10 w-auto" unoptimized priority />
          <h1 className="hidden text-lg font-medium text-primary sm:block sm:text-xl">Resultados I03</h1>
          <Image src="/logos/anii.png" alt="ANII" width={249} height={50} className="h-7 w-auto" unoptimized priority />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select aria-label="IES" className={selectCls} value={f.ies} onChange={set("ies")}>
            <option value="">Todas las IES</option>
            {ies.map((i) => (
              <option key={i.codigo} value={i.codigo}>{i.codigo} · {i.nombre}</option>
            ))}
          </select>
          <select aria-label="Momento" className={selectCls} value={f.momento} onChange={set("momento")}>
            <option value="">V1 y V2</option>
            {MOMENTOS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select aria-label="Modalidad" className={selectCls} value={f.modalidad} onChange={set("modalidad")}>
            <option value="">Todas las modalidades</option>
            {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <a
            href={`/api/exportar${qs ? `?${qs}` : ""}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary-dark active:scale-[.98]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
            </svg>
            Exportar a Excel
          </a>
        </div>

        {error && (
          <div className="rounded-2xl border border-[#f5bc18] bg-[#fff8e1] p-4 text-sm text-ink">
            No se pudieron cargar los datos
          </div>
        )}

        {!datos && cargando && <Esqueleto />}

        {datos && (
          <div className={`space-y-4 transition-opacity duration-300 ${cargando ? "opacity-50" : "opacity-100"}`}>
            <Tarjetas r={datos.resumen} />

            {datos.resumen.total === 0 ? (
              <Panel titulo="Resultados"><Vacio /></Panel>
            ) : (
              <>
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  <Panel titulo="Promedio por criterio"><PorCriterio filas={datos.porCriterio} /></Panel>
                  <Panel titulo="Niveles por criterio"><Distribucion filas={datos.distribucion} /></Panel>
                  <Panel titulo="Clasificación por IES"><ClasificacionIes filas={datos.clasificacionIes} /></Panel>
                  <Panel titulo="Evolución por docente"><Evolucion filas={datos.evolucionDocente} /></Panel>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Panel titulo="O2 según conectividad"><Promedios filas={datos.correlaciones.conectividad} clave="opcion" /></Panel>
                  <Panel titulo="O2 según clima"><Promedios filas={datos.correlaciones.clima} clave="opcion" /></Panel>
                  <Panel titulo="Promedio por modalidad"><Promedios filas={datos.modalidad} clave="modalidad" /></Panel>
                  <Panel titulo="Uso de IA por modalidad"><UsoIa filas={datos.usoIa} /></Panel>
                </div>

                <Panel titulo="IES por criterio"><MapaCalor filas={datos.heatmap} /></Panel>
              </>
            )}

            <Notas />
          </div>
        )}
      </main>
    </div>
  );
}

function Notas() {
  return (
    <details className="group rounded-2xl border border-mist bg-white p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink/70">
        Notas del instrumento
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-4 space-y-4 text-sm text-ink/80">
        <div>
          <h3 className="mb-1 font-medium text-ink">Resultado de la observación (2.1 a 2.4)</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Integración efectiva documentada:</b> los cuatro criterios en nivel 2 o más, con respaldo de observación y artefacto.</li>
            <li><b>Integración en desarrollo:</b> los cuatro valorados y al menos uno por debajo de 2.</li>
            <li><b>Evidencia insuficiente:</b> algún criterio con NO, o sin respaldo.</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-1 font-medium text-ink">NO y NA</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>NO:</b> falta evidencia para valorar.</li>
            <li><b>NA:</b> no aplica. Solo 2.5 y los criterios de O3.</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-1 font-medium text-ink">Confidencialidad</h3>
          <p>Reporte agregado. Los grupos con menos de 3 observaciones no se desglosan.</p>
        </div>
      </div>
    </details>
  );
}
