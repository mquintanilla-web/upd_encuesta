"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Resultados } from "@/lib/resultados";
import { O1, O2, O3 } from "@/lib/instrumento";

const NOMBRES = new Map([...O1.criterios, ...O2.criterios, ...O3.criterios].map((c) => [c.id, c.nombre]));
const conNombre = (id: unknown) => (NOMBRES.get(String(id)) ? `${id} · ${NOMBRES.get(String(id))}` : String(id));

export const COLORES = {
  v1: "#9db9cf",
  v2: "#094875",
  niveles: ["#c3d2de", "#8fb0c9", "#0471a3", "#094875"],
  clasif: {
    "Integración efectiva documentada": "#094875",
    "Integración en desarrollo": "#f5bc18",
    "Evidencia insuficiente": "#b6c2cd",
  } as Record<string, string>,
};
const CLASIF_CORTA: Record<string, string> = {
  "Integración efectiva documentada": "Efectiva",
  "Integración en desarrollo": "En desarrollo",
  "Evidencia insuficiente": "Insuficiente",
};
const EJE = { fontSize: 12, fill: "#27374d" };
const TOOLTIP = {
  contentStyle: { borderRadius: 12, border: "1px solid #dde6ed", boxShadow: "none", fontSize: 12 },
  cursor: { fill: "#dde6ed55" },
};

export function Panel({ titulo, info, children, className = "" }: { titulo: string; info?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`relative rounded-2xl border border-mist bg-white p-4 sm:p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink/70">
        {titulo}
        {info && (
          <span className="group">
            <button
              type="button"
              aria-label={`Qué muestra: ${titulo}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-ink/40 transition hover:bg-mist hover:text-primary focus:bg-mist focus:text-primary focus:outline-none"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5m0-8h.01" />
              </svg>
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute inset-x-4 top-12 z-20 rounded-xl bg-ink p-3 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 sm:inset-x-5"
            >
              {info}
            </span>
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

const Alto = ({ children, h = 260 }: { children: ReactNode; h?: number }) => (
  <div style={{ height: h }} className="w-full">
    <ResponsiveContainer width="100%" height="100%">
      {children as React.ReactElement}
    </ResponsiveContainer>
  </div>
);

export function Tarjetas({ r }: { r: Resultados["resumen"] }) {
  const items = [
    ["Observaciones", r.total],
    ["V1", r.v1],
    ["V2", r.v2],
    ["IES", r.ies],
    ["Minutos promedio", r.duracion_prom ?? "—"],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([k, v], i) => (
        <div
          key={k}
          className={`rounded-2xl border border-mist bg-white p-4 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
        >
          <div className="text-3xl font-semibold tracking-tight text-primary">{v}</div>
          <div className="mt-1 text-xs text-ink/60">{k}</div>
        </div>
      ))}
    </div>
  );
}

export function PorCriterio({ filas }: { filas: Resultados["porCriterio"] }) {
  const mapa = new Map<string, { criterio: string; V1?: number; V2?: number }>();
  for (const f of filas) {
    const e = mapa.get(f.criterio as string) ?? { criterio: f.criterio as string };
    e[f.momento as "V1" | "V2"] = (f.promedio as number | null) ?? undefined;
    mapa.set(f.criterio as string, e);
  }
  return (
    <Alto h={280}>
      <BarChart data={[...mapa.values()]} margin={{ left: -20, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey="criterio" tick={EJE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={EJE} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} labelFormatter={conNombre} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="V1" fill={COLORES.v1} radius={[4, 4, 0, 0]} />
        <Bar dataKey="V2" fill={COLORES.v2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </Alto>
  );
}

export function Distribucion({ filas }: { filas: Resultados["distribucion"] }) {
  const mapa = new Map<string, Record<string, number | string>>();
  for (const f of filas) {
    const e = mapa.get(f.criterio) ?? { criterio: f.criterio, total: 0 };
    e[`n${f.nivel}`] = f.n;
    e.total = (e.total as number) + f.n;
    mapa.set(f.criterio, e);
  }
  const datos = [...mapa.values()].map((e) => {
    const o: Record<string, number | string> = { criterio: e.criterio };
    for (const n of [1, 2, 3, 4]) o[`Nivel ${n}`] = Math.round((((e[`n${n}`] as number) ?? 0) / (e.total as number)) * 100);
    return o;
  });
  return (
    <Alto h={280}>
      <BarChart data={datos} margin={{ left: -20, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey="criterio" tick={EJE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tick={EJE} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} labelFormatter={conNombre} formatter={(v) => `${v}%`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {[1, 2, 3, 4].map((n) => (
          <Bar key={n} dataKey={`Nivel ${n}`} stackId="a" fill={COLORES.niveles[n - 1]} />
        ))}
      </BarChart>
    </Alto>
  );
}

export function ClasificacionIes({ filas }: { filas: Resultados["clasificacionIes"] }) {
  const nombres = new Map(filas.map((f) => [f.ies, f.nombre]));
  const mapa = new Map<string, Record<string, number | string>>();
  for (const f of filas) {
    const e = mapa.get(f.ies) ?? { ies: f.ies };
    if (!f.suprimido && f.clasificacion) e[CLASIF_CORTA[f.clasificacion]] = f.n;
    mapa.set(f.ies, e);
  }
  return (
    <Alto h={280}>
      <BarChart data={[...mapa.values()]} margin={{ left: -20, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey="ies" tick={EJE} tickLine={false} axisLine={false} />
        <YAxis tick={EJE} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} labelFormatter={(l) => nombres.get(String(l)) ?? String(l)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {Object.entries(COLORES.clasif).map(([k, c]) => (
          <Bar key={k} dataKey={CLASIF_CORTA[k]} stackId="a" fill={c} />
        ))}
      </BarChart>
    </Alto>
  );
}

export function Evolucion({ filas }: { filas: Resultados["evolucionDocente"] }) {
  const get = (g: string) => filas.find((f) => f.grupo === g)?.n ?? 0;
  const items = [
    { g: "mejoraron", t: "Mejoraron", c: "text-primary", d: "M12 19V5m-6 6 6-6 6 6" },
    { g: "mantuvieron", t: "Se mantuvieron", c: "text-ink/60", d: "M5 12h14" },
    { g: "bajaron", t: "Bajaron", c: "text-[#b7791f]", d: "M12 5v14m-6-6 6 6 6-6" },
  ];
  if (!filas.length) return <Vacio />;
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((i) => (
        <div key={i.g} className="rounded-xl bg-mist/50 p-3 text-center">
          <svg viewBox="0 0 24 24" className={`mx-auto h-6 w-6 ${i.c}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={i.d} />
          </svg>
          <div className={`mt-1 text-3xl font-semibold ${i.c}`}>{get(i.g)}</div>
          <div className="text-xs text-ink/60">{i.t}</div>
        </div>
      ))}
    </div>
  );
}

export function Promedios({ filas, clave }: { filas: Resultados["modalidad"]; clave: string }) {
  const corto: Record<string, string> = {
    "Adecuados": "Adecuada",
    "Con limitaciones parciales": "Parcial",
    "Con limitaciones que afectaron la sesión": "Afectó",
    "Participación irregular": "Irregular",
    "Favorece la participación": "Favorece",
    "Limita la participación": "Limita",
  };
  const datos = filas.map((f) => ({ nombre: f[clave] as string, Promedio: f.promedio as number | null }));
  return (
    <Alto h={200}>
      <BarChart data={datos} margin={{ left: -20, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey="nombre" interval={0} tickFormatter={(v: string) => corto[v] ?? v} tick={EJE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={EJE} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} />
        <Bar dataKey="Promedio" fill={COLORES.v2} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </Alto>
  );
}

export function UsoIa({ filas }: { filas: Resultados["usoIa"] }) {
  const datos = filas.map((f) => ({
    modalidad: f.modalidad as string,
    "Con IA": f.suprimido ? null : Math.round(((f.con_ia as number) / f.n) * 100),
  }));
  return (
    <Alto h={200}>
      <BarChart data={datos} margin={{ left: -20, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey="modalidad" tick={EJE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} unit="%" tick={EJE} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} />
        <Bar dataKey="Con IA" fill="#f5bc18" radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </Alto>
  );
}

export function MapaCalor({ filas }: { filas: Resultados["heatmap"] }) {
  const criterios = [...new Set(filas.map((f) => f.criterio as string))].sort();
  const ies = [...new Set(filas.map((f) => f.ies as string))];
  const nombreIes = new Map(filas.map((f) => [f.ies as string, f.nombre as string]));
  const celda = new Map(filas.map((f) => [`${f.ies}|${f.criterio}`, f.promedio as number | null]));
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white" />
            {criterios.map((c) => (
              <th key={c} title={conNombre(c)} className="px-1 pb-1 font-medium text-ink/60">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ies.map((i) => (
            <tr key={i}>
              <th title={nombreIes.get(i)} className="sticky left-0 max-w-32 truncate whitespace-nowrap bg-white pr-2 text-left font-medium text-ink/70 sm:max-w-56">
                {nombreIes.get(i) ?? i}
              </th>
              {criterios.map((c) => {
                const v = celda.get(`${i}|${c}`);
                const t = v == null ? 0 : (v - 1) / 3;
                return (
                  <td
                    key={c}
                    className="min-w-9 rounded-md py-2 tabular-nums transition-colors"
                    style={{
                      background: v == null ? "#f1f5f8" : `rgba(9,72,117,${0.08 + 0.92 * t})`,
                      color: t > 0.4 ? "#fff" : "#27374d",
                    }}
                    title={v == null ? "Menos de 3 observaciones" : `${nombreIes.get(i)} · ${conNombre(c)}: ${v}`}
                  >
                    {v == null ? "—" : v.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Vacio() {
  return <div className="py-10 text-center text-sm text-ink/40">Sin datos</div>;
}

export function Esqueleto() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-mist/60" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-mist/60" />
        ))}
      </div>
    </div>
  );
}
