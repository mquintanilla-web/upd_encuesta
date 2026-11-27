"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { O4 } from "@/lib/instrumento";
import { Alto, COLORES, EJE, Esqueleto, Evolucion, MapaCalor, Panel, TOOLTIP, Vacio, conNombre } from "./panels";

export const HOJAS = [
  { id: "resumen", nombre: "Resumen" },
  { id: "criterios", nombre: "Criterios" },
  { id: "ies", nombre: "IES" },
  { id: "docentes", nombre: "Docentes y mentores" },
  { id: "contexto", nombre: "Condiciones" },
  { id: "modalidad", nombre: "Modalidad e IA" },
  { id: "tiempo", nombre: "Tiempo" },
  { id: "texto", nombre: "Palabras" },
] as const;
export type HojaId = (typeof HOJAS)[number]["id"];

const C = {
  v1: "#9db9cf", v2: "#094875", o1: "#0471a3", o2: "#094875", o3: "#f5bc18",
  sube: "#0471a3", baja: "#c98a1b", gris: "#b6c2cd",
  modalidad: { Presencial: "#094875", Mixta: "#0471a3", Virtual: "#f5bc18" } as Record<string, string>,
};
const CLASIF_CORTA: Record<string, string> = {
  "Integración efectiva documentada": "Efectiva",
  "Integración en desarrollo": "En desarrollo",
  "Evidencia insuficiente": "Insuficiente",
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Carga una hoja de análisis; cada hoja se monta sola, así que nunca mezcla datos de otra. */
function useAnalisis(seccion: string, qs: string, extra = "") {
  const clave = `${seccion}|${qs}|${extra}`;
  const [r, setR] = useState<{ clave: string; datos: any; error: boolean }>({ clave: "", datos: null, error: false });
  useEffect(() => {
    const ctrl = new AbortController();
    const url = `/api/analisis?seccion=${seccion}${qs ? `&${qs}` : ""}${extra ? `&${extra}` : ""}`;
    fetch(url, { signal: ctrl.signal })
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then((datos) => setR({ clave, datos, error: false }))
      .catch((e) => {
        if (e?.name !== "AbortError") setR({ clave, datos: null, error: true });
      });
    return () => ctrl.abort();
  }, [clave, seccion, qs, extra]);
  return { datos: r.datos, cargando: r.clave !== clave, error: r.error && r.clave === clave };
}

function Cuerpo({ estado, children }: { estado: ReturnType<typeof useAnalisis>; children: (d: any) => React.ReactNode }) {
  if (!estado.datos)
    return estado.error ? (
      <div className="rounded-2xl border border-[#f5bc18] bg-[#fff8e1] p-4 text-sm text-ink">No se pudieron cargar los datos</div>
    ) : (
      <Esqueleto />
    );
  return <div className={`space-y-4 transition-opacity duration-300 ${estado.cargando ? "opacity-50" : "opacity-100"}`}>{children(estado.datos)}</div>;
}

const Rejilla = ({ children, cols = "lg:grid-cols-2" }: { children: React.ReactNode; cols?: string }) => (
  <div className={`grid items-start gap-4 ${cols}`}>{children}</div>
);

/* ---------- Gráficas genéricas ---------- */

type Serie = { key: string; nombre?: string; color: string; celdas?: (d: any) => string };

function Barras({ datos, x, series, apilado = false, h = 260, dominio, formato, etiqueta, unidad }: {
  datos: any[]; x: string; series: Serie[]; apilado?: boolean; h?: number;
  dominio?: [number, number]; formato?: (v: any) => string; etiqueta?: (l: any) => string; unidad?: string;
}) {
  if (!datos.length) return <Vacio />;
  return (
    <Alto h={h}>
      <BarChart data={datos} margin={{ left: -18, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey={x} interval={0} tick={EJE} tickLine={false} axisLine={false} />
        <YAxis domain={dominio} unit={unidad} tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} formatter={formato} labelFormatter={etiqueta} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.nombre ?? s.key} fill={s.color} stackId={apilado ? "a" : undefined} radius={apilado ? 0 : [4, 4, 0, 0]} maxBarSize={48}>
            {s.celdas && datos.map((d, i) => <Cell key={i} fill={s.celdas!(d)} />)}
          </Bar>
        ))}
      </BarChart>
    </Alto>
  );
}

function Linea({ datos, x, series, h = 260, dominio }: { datos: any[]; x: string; series: Serie[]; h?: number; dominio?: [number, number] }) {
  if (!datos.length) return <Vacio />;
  return (
    <Alto h={h}>
      <LineChart data={datos} margin={{ left: -18, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="#dde6ed" />
        <XAxis dataKey={x} tick={EJE} tickLine={false} axisLine={false} />
        <YAxis domain={dominio} tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.nombre ?? s.key} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </Alto>
  );
}

function Dona({ datos, nombre, valor, colores }: { datos: any[]; nombre: string; valor: string; colores: string[] }) {
  if (!datos.length) return <Vacio />;
  return (
    <Alto h={240}>
      <PieChart>
        <Pie data={datos} dataKey={valor} nameKey={nombre} innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
          {datos.map((_, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
        </Pie>
        <Tooltip {...TOOLTIP} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </Alto>
  );
}

function BarrasLista({ items, max, sufijo = "" }: { items: { etiqueta: string; valor: number | null }[]; max?: number; sufijo?: string }) {
  if (!items.length) return <Vacio />;
  const m = max ?? Math.max(1, ...items.map((i) => i.valor ?? 0));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.etiqueta}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="text-ink/80">{i.etiqueta}</span>
            <span className="font-medium tabular-nums text-ink">{i.valor == null ? "—" : `${i.valor}${sufijo}`}</span>
          </div>
          <div className="h-2 rounded-full bg-mist/70">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((i.valor ?? 0) / m) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Matriz({ filas, columnas, valor, titulo }: { filas: { id: string; nombre: string }[]; columnas: { id: string; nombre: string }[]; valor: (f: string, c: string) => number; titulo: string }) {
  const max = Math.max(1, ...filas.flatMap((f) => columnas.map((c) => valor(f.id, c.id))));
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white" />
            {columnas.map((c) => <th key={c.id} className="px-1 pb-1 font-medium text-ink/60">{c.nombre}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <th className="sticky left-0 whitespace-nowrap bg-white pr-2 text-left font-medium text-ink/70">{f.nombre}</th>
              {columnas.map((c) => {
                const v = valor(f.id, c.id);
                const t = v / max;
                return (
                  <td
                    key={c.id}
                    title={`${f.nombre}, ${c.nombre}: ${v} ${titulo}`}
                    className="min-w-8 rounded-md py-2.5 tabular-nums transition-colors"
                    style={{ background: v ? `rgba(9,72,117,${0.1 + 0.9 * t})` : "#f1f5f8", color: t > 0.45 ? "#fff" : "#27374d" }}
                  >
                    {v || ""}
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

function Nube({ palabras }: { palabras: { palabra: string; n: number }[] }) {
  const orden = useMemo(() => {
    const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return [...palabras].sort((a, b) => hash(a.palabra) - hash(b.palabra));
  }, [palabras]);
  if (!palabras.length) return <Vacio />;
  const max = Math.max(...palabras.map((p) => p.n));
  const min = Math.min(...palabras.map((p) => p.n));
  const tonos = ["#094875", "#0471a3", "#27374d", "#c98a1b", "#5b86a6"];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-4">
      {orden.map((p) => {
        const t = max === min ? 0.5 : (Math.sqrt(p.n) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min));
        const rango = palabras.findIndex((x) => x.palabra === p.palabra);
        return (
          <span
            key={p.palabra}
            title={`${p.palabra}: ${p.n}`}
            className="cursor-default select-none font-semibold leading-tight transition-transform duration-200 hover:scale-110"
            style={{ fontSize: `${14 + t * 46}px`, color: tonos[rango < 5 ? 0 : rango % tonos.length], opacity: 0.75 + t * 0.25 }}
          >
            {p.palabra}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- Hojas ---------- */

export function Hoja({ id, qs }: { id: Exclude<HojaId, "resumen">; qs: string }) {
  switch (id) {
    case "criterios": return <HojaCriterios qs={qs} />;
    case "ies": return <HojaIes qs={qs} />;
    case "docentes": return <HojaDocentes qs={qs} />;
    case "contexto": return <HojaContexto qs={qs} />;
    case "modalidad": return <HojaModalidad qs={qs} />;
    case "tiempo": return <HojaTiempo qs={qs} />;
    case "texto": return <HojaTexto qs={qs} />;
  }
}

function HojaCriterios({ qs }: { qs: string }) {
  const estado = useAnalisis("criterios", qs);
  return (
    <Cuerpo estado={estado}>
      {(d) => {
        const por = new Map<string, any>();
        for (const r of d.porCriterio) {
          const e = por.get(r.criterio) ?? { criterio: r.criterio };
          e[r.momento] = r.promedio;
          e[`n${r.momento}`] = r.n;
          por.set(r.criterio, e);
        }
        const filas = [...por.values()];
        const cambio = filas.map((e) => ({ criterio: e.criterio, cambio: e.V1 != null && e.V2 != null ? r2(e.V2 - e.V1) : null }));
        const ranking = filas
          .map((e) => {
            const n1 = e.nV1 ?? 0, n2 = e.nV2 ?? 0;
            const tot = (e.V1 != null ? n1 : 0) + (e.V2 != null ? n2 : 0);
            const v = tot ? ((e.V1 != null ? e.V1 * n1 : 0) + (e.V2 != null ? e.V2 * n2 : 0)) / tot : null;
            return { etiqueta: conNombre(e.criterio), valor: v == null ? null : r2(v) };
          })
          .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
        const tot = new Map<string, any>();
        for (const r of d.estados) {
          const e = tot.get(r.criterio) ?? { criterio: r.criterio, total: 0, NO: 0, NA: 0 };
          e.total += r.n;
          if (r.estado !== "valor") e[r.estado] = r.n;
          tot.set(r.criterio, e);
        }
        const faltantes = [...tot.values()].map((e) => ({ criterio: e.criterio, NO: pct(e.NO, e.total), NA: pct(e.NA, e.total) }));
        const dim = new Map<string, any>();
        for (const r of d.porDimension) {
          const e = dim.get(r.dim) ?? { dim: `O${r.dim}` };
          e[r.momento] = r.promedio;
          dim.set(r.dim, e);
        }
        return (
          <>
            <Rejilla>
              <Panel titulo="Perfil por criterio" info="Radar con el promedio (1 a 4) de cada criterio en V1 y V2. Una forma más abierta indica mejores promedios."><RadarCriterios datos={filas} /></Panel>
              <Panel titulo="Cambio de V1 a V2" info="Diferencia entre el promedio de V2 y el de V1 en cada criterio. Azul sube, ocre baja."><Barras datos={cambio} x="criterio" series={[{ key: "cambio", nombre: "Cambio", color: C.sube, celdas: (r) => ((r.cambio ?? 0) >= 0 ? C.sube : C.baja) }]} etiqueta={conNombre} /></Panel>
              <Panel titulo="Promedio por dimensión" info="Promedio de todos los criterios de O1, O2 y O3, separado por V1 y V2."><Barras datos={[...dim.values()]} x="dim" series={[{ key: "V1", color: C.v1 }, { key: "V2", color: C.v2 }]} dominio={[0, 4]} /></Panel>
              <Panel titulo="Variabilidad por criterio" info="Desviación estándar de los niveles de cada criterio. Más alta significa respuestas más dispersas entre observaciones."><Barras datos={d.variabilidad} x="criterio" series={[{ key: "sd", nombre: "Desviación", color: C.o1 }]} dominio={[0, 2]} etiqueta={conNombre} /></Panel>
            </Rejilla>
            <Rejilla>
              <Panel titulo="Ranking de criterios" info="Criterios ordenados por su promedio general (V1 y V2 juntos)."><BarrasLista items={ranking} max={4} /></Panel>
              <Panel titulo="NO y NA por criterio" info="Porcentaje de observaciones donde el criterio quedó en NO (falta evidencia) o NA (no aplica)."><Barras datos={faltantes} x="criterio" apilado unidad="%" series={[{ key: "NO", color: "#c2410c" }, { key: "NA", color: C.gris }]} etiqueta={conNombre} formato={(v) => `${v}%`} /></Panel>
            </Rejilla>
          </>
        );
      }}
    </Cuerpo>
  );
}

function RadarCriterios({ datos }: { datos: any[] }) {
  if (!datos.length) return <Vacio />;
  return (
    <Alto h={320}>
      <RadarChart data={datos} outerRadius="72%">
        <PolarGrid stroke="#dde6ed" />
        <PolarAngleAxis dataKey="criterio" tick={EJE} />
        <PolarRadiusAxis domain={[0, 4]} tickCount={5} tick={{ fontSize: 10, fill: "#6b7a8a" }} axisLine={false} />
        <Radar name="V1" dataKey="V1" stroke={C.v1} fill={C.v1} fillOpacity={0.25} />
        <Radar name="V2" dataKey="V2" stroke={C.v2} fill={C.v2} fillOpacity={0.3} />
        <Tooltip {...TOOLTIP} labelFormatter={conNombre} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </Alto>
  );
}

function HojaIes({ qs }: { qs: string }) {
  const estado = useAnalisis("ies", qs);
  return (
    <Cuerpo estado={estado}>
      {(d) => {
        const nombres = new Map<string, string>([...d.promedio, ...d.observaciones].map((r: any) => [r.ies, r.nombre]));
        const etiqueta = (l: any) => nombres.get(String(l)) ?? String(l);
        const prom = new Map<string, any>();
        for (const r of d.promedio) {
          const e = prom.get(r.ies) ?? { ies: r.ies };
          e[r.momento] = r.promedio;
          prom.set(r.ies, e);
        }
        const mejora = [...prom.values()].map((e) => ({ ies: e.ies, mejora: e.V1 != null && e.V2 != null ? r2(e.V2 - e.V1) : null }));
        const obs = new Map<string, any>();
        for (const r of d.observaciones) {
          const e = obs.get(r.ies) ?? { ies: r.ies };
          e[r.momento] = r.n;
          obs.set(r.ies, e);
        }
        const dim = new Map<string, any>();
        for (const r of d.dimension) {
          const e = dim.get(r.ies) ?? { ies: r.ies };
          e[`O${r.dim}`] = r.promedio;
          dim.set(r.ies, e);
        }
        const efectiva = d.efectiva.map((r: any) => ({ ies: r.ies, "% efectiva": r.suprimido ? null : pct(r.efectivas, r.n) }));
        const ia = d.ia.map((r: any) => ({ ies: r.ies, "% con IA": r.suprimido ? null : pct(r.con_ia, r.n) }));
        return (
          <>
            <Rejilla>
              <Panel titulo="Promedio general por IES" info="Promedio de todos los criterios valorados en cada IES, separado por V1 y V2. Pase el cursor para ver el nombre completo."><Barras datos={[...prom.values()]} x="ies" series={[{ key: "V1", color: C.v1 }, { key: "V2", color: C.v2 }]} dominio={[0, 4]} etiqueta={etiqueta} /></Panel>
              <Panel titulo="Mejora de V1 a V2 por IES" info="Diferencia entre el promedio de V2 y el de V1 en cada IES. Azul sube, ocre baja."><Barras datos={mejora} x="ies" series={[{ key: "mejora", nombre: "Mejora", color: C.sube, celdas: (r) => ((r.mejora ?? 0) >= 0 ? C.sube : C.baja) }]} etiqueta={etiqueta} /></Panel>
              <Panel titulo="Observaciones por IES" info="Cantidad de observaciones realizadas en cada IES, separadas en V1 y V2."><Barras datos={[...obs.values()]} x="ies" apilado series={[{ key: "V1", color: C.v1 }, { key: "V2", color: C.v2 }]} etiqueta={etiqueta} /></Panel>
              <Panel titulo="Integración efectiva por IES" info="Porcentaje de observaciones clasificadas como integración efectiva documentada en cada IES."><Barras datos={efectiva} x="ies" unidad="%" dominio={[0, 100]} series={[{ key: "% efectiva", color: C.o1 }]} etiqueta={etiqueta} formato={(v) => `${v}%`} /></Panel>
              <Panel titulo="Promedio por dimensión e IES" info="Promedio de O1, O2 y O3 en cada IES."><Barras datos={[...dim.values()]} x="ies" dominio={[0, 4]} series={[{ key: "O1", color: C.o1 }, { key: "O2", color: C.o2 }, { key: "O3", color: C.o3 }]} etiqueta={etiqueta} /></Panel>
              <Panel titulo="Uso de IA por IES" info="Porcentaje de observaciones donde se valoró algún criterio de O3."><Barras datos={ia} x="ies" unidad="%" dominio={[0, 100]} series={[{ key: "% con IA", color: C.o3 }]} etiqueta={etiqueta} formato={(v) => `${v}%`} /></Panel>
            </Rejilla>
            <Panel titulo="IES por criterio" info="Mapa de calor. Cada celda es el promedio de un criterio (columna) en una IES (fila). Más oscuro, mayor nivel. Si hay menos de 3 observaciones, la celda queda vacía."><MapaCalor filas={d.heatmap} /></Panel>
          </>
        );
      }}
    </Cuerpo>
  );
}

function HojaDocentes({ qs }: { qs: string }) {
  const estado = useAnalisis("docentes", qs);
  return (
    <Cuerpo estado={estado}>
      {(d) => {
        const cambios: number[] = d.cambios;
        const rangos: [string, (x: number) => boolean][] = [
          ["Baja más de 0.5", (x) => x < -0.5],
          ["Baja 0.1 a 0.5", (x) => x >= -0.5 && x < -0.1],
          ["Sin cambio", (x) => x >= -0.1 && x <= 0.1],
          ["Sube 0.1 a 0.5", (x) => x > 0.1 && x <= 0.5],
          ["Sube 0.5 a 1", (x) => x > 0.5 && x <= 1],
          ["Sube más de 1", (x) => x > 1],
        ];
        const histograma = rangos.map(([rango, f]) => ({ rango, docentes: cambios.filter(f).length }));
        const evol = cambios.length
          ? [
              { grupo: "mejoraron", n: cambios.filter((x) => x > 0.1).length },
              { grupo: "mantuvieron", n: cambios.filter((x) => x >= -0.1 && x <= 0.1).length },
              { grupo: "bajaron", n: cambios.filter((x) => x < -0.1).length },
            ]
          : [];
        return (
          <>
            <Rejilla>
              <Panel titulo="Evolución por docente" info="Compara el promedio general de cada docente entre V1 y V2. Mejoró o bajó si el cambio supera 0.1 puntos."><Evolucion filas={evol} /></Panel>
              <Panel titulo="Cuánto cambió cada docente" info="Cantidad de docentes según cuánto cambió su promedio de V1 a V2."><Barras datos={cambios.length ? histograma : []} x="rango" series={[{ key: "docentes", nombre: "Docentes", color: C.o1 }]} h={240} /></Panel>
              <Panel titulo="Docentes con V1 y V2" info="Cuántos docentes tienen ambas visitas, solo V1 o solo V2."><Dona datos={d.completitud} nombre="grupo" valor="n" colores={[C.v2, C.v1, C.o3]} /></Panel>
              <Panel titulo="Visitas por docente" info="Cuántos docentes tienen 1, 2, 3 o más observaciones."><Barras datos={d.porDocente.map((r: any) => ({ visitas: `${r.visitas} ${r.visitas === 1 ? "visita" : "visitas"}`, docentes: r.docentes }))} x="visitas" series={[{ key: "docentes", nombre: "Docentes", color: C.o2 }]} h={240} /></Panel>
              <Panel titulo="Observaciones por mentor" info="Cantidad de observaciones acompañadas por cada mentor o mentora. Se muestran como M1, M2... para no exponer códigos."><Barras datos={d.mentores} x="mentor" series={[{ key: "n", nombre: "Observaciones", color: C.o1 }]} h={240} /></Panel>
              <Panel titulo="Promedio por mentor" info="Promedio de los criterios valorados en las observaciones de cada mentor o mentora. Con menos de 3 observaciones no se muestra."><Barras datos={d.mentores} x="mentor" dominio={[0, 4]} series={[{ key: "promedio", nombre: "Promedio", color: C.o2 }]} h={240} /></Panel>
              <Panel titulo="Asignaturas más observadas" info="Las diez asignaturas con más observaciones (mínimo 3)."><BarrasLista items={d.asignaturas.map((a: any) => ({ etiqueta: a.asignatura, valor: a.n }))} /></Panel>
              <Panel titulo="Promedio por asignatura" info="Promedio de los criterios valorados en esas asignaturas."><BarrasLista max={4} items={d.asignaturas.map((a: any) => ({ etiqueta: a.asignatura, valor: a.promedio }))} /></Panel>
            </Rejilla>
          </>
        );
      }}
    </Cuerpo>
  );
}

function HojaContexto({ qs }: { qs: string }) {
  const estado = useAnalisis("contexto", qs);
  return (
    <Cuerpo estado={estado}>
      {(d) => {
        const cond = (item: string) => d.condiciones.filter((c: any) => c.item === item);
        const prom = (item: string) => d.o2.filter((c: any) => c.item === item);
        const mods = ["Presencial", "Mixta", "Virtual"];
        const opciones = O4[2].opciones;
        const lim = mods.map((m) => {
          const e: any = { modalidad: m };
          for (const o of opciones) e[o] = d.limitaciones.find((x: any) => x.modalidad === m && x.opcion === o)?.n ?? 0;
          return e;
        });
        const colores = ["#094875", "#0471a3", "#c98a1b", "#b6c2cd"];
        return (
          <>
            <Rejilla cols="lg:grid-cols-2 xl:grid-cols-3">
              {O4.map((i) => {
                const filas = cond(i.item);
                const total = filas.reduce((a: number, r: any) => a + r.n, 0) || 1;
                return (
                  <Panel key={i.item} titulo={`${i.item} ${i.titulo.split(" para ")[0]}`} info={`Cuántas observaciones registraron cada opción de ${i.item}: ${i.titulo}.`}>
                    <BarrasLista items={filas.map((r: any) => ({ etiqueta: r.opcion, valor: pct(r.n, total) }))} sufijo="%" max={100} />
                  </Panel>
                );
              })}
            </Rejilla>
            <Rejilla cols="lg:grid-cols-2 xl:grid-cols-3">
              {O4.map((i) => (
                <Panel key={i.item} titulo={`O2 según ${i.item}`} info={`Promedio de los criterios 2.1 a 2.4 según la opción registrada en ${i.item}. Con menos de 3 observaciones no se muestra.`}>
                  <BarrasLista max={4} items={prom(i.item).map((r: any) => ({ etiqueta: r.opcion, valor: r.promedio }))} />
                </Panel>
              ))}
              <Panel titulo="Origen de las interrupciones" info="Origen registrado en 4.2 cuando hubo interrupciones. Una observación puede tener varios orígenes.">
                <BarrasLista items={d.origen.map((r: any) => ({ etiqueta: r.origen, valor: r.n }))} />
              </Panel>
            </Rejilla>
            <Panel titulo="Conectividad por modalidad" info="Cantidad de observaciones por opción de 4.3, conectividad y acceso a dispositivos o plataformas, según la modalidad.">
              <Barras datos={lim} x="modalidad" apilado series={opciones.map((o, i) => ({ key: o, color: colores[i] }))} />
            </Panel>
          </>
        );
      }}
    </Cuerpo>
  );
}

function HojaModalidad({ qs }: { qs: string }) {
  const estado = useAnalisis("modalidad", qs);
  return (
    <Cuerpo estado={estado}>
      {(d) => {
        const prom = new Map<string, any>();
        for (const r of d.promedio) {
          const e = prom.get(r.modalidad) ?? { modalidad: r.modalidad };
          e[r.momento] = r.promedio;
          prom.set(r.modalidad, e);
        }
        const o3 = new Map<string, any>();
        for (const r of d.o3) {
          const e = o3.get(r.criterio) ?? { criterio: r.criterio };
          e[r.modalidad] = r.promedio;
          o3.set(r.criterio, e);
        }
        const cl = new Map<string, any>();
        for (const r of d.clasificacion) {
          const e = cl.get(r.modalidad) ?? { modalidad: r.modalidad };
          e[CLASIF_CORTA[r.clasificacion] ?? r.clasificacion] = r.n;
          cl.set(r.modalidad, e);
        }
        const mods = ["Presencial", "Mixta", "Virtual"];
        return (
          <Rejilla>
            <Panel titulo="Promedio por modalidad" info="Promedio de todos los criterios valorados según la modalidad, separado por V1 y V2."><Barras datos={[...prom.values()]} x="modalidad" dominio={[0, 4]} series={[{ key: "V1", color: C.v1 }, { key: "V2", color: C.v2 }]} /></Panel>
            <Panel titulo="Uso de IA por modalidad" info="Porcentaje de observaciones donde se valoró algún criterio de O3."><Barras datos={d.ia.map((r: any) => ({ modalidad: r.modalidad, "% con IA": r.suprimido ? null : pct(r.con_ia, r.n) }))} x="modalidad" unidad="%" dominio={[0, 100]} series={[{ key: "% con IA", color: C.o3 }]} formato={(v) => `${v}%`} /></Panel>
            <Panel titulo="O3 por criterio y modalidad" info="Promedio de cada criterio de IA (3.1 a 3.4) según la modalidad. Solo cuenta observaciones donde aplicó."><Barras datos={[...o3.values()]} x="criterio" dominio={[0, 4]} series={mods.map((m) => ({ key: m, color: C.modalidad[m] }))} etiqueta={conNombre} /></Panel>
            <Panel titulo="Clasificación por modalidad" info="Cantidad de observaciones por resultado (efectiva, en desarrollo, insuficiente) según la modalidad."><Barras datos={[...cl.values()]} x="modalidad" apilado series={Object.entries(COLORES.clasif).map(([k, c]) => ({ key: CLASIF_CORTA[k], color: c }))} /></Panel>
            <Panel titulo="Duración promedio" info="Minutos promedio de la observación según la modalidad. La duración la registra el sistema entre el inicio y el cierre."><Barras datos={d.duracion.map((r: any) => ({ modalidad: r.modalidad, Minutos: r.suprimido ? null : r.promedio }))} x="modalidad" series={[{ key: "Minutos", color: C.o1 }]} /></Panel>
          </Rejilla>
        );
      }}
    </Cuerpo>
  );
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function HojaTiempo({ qs }: { qs: string }) {
  const estado = useAnalisis("tiempo", qs);
  return (
    <Cuerpo estado={estado}>
      {(d) => {
        const sem = new Map<string, any>();
        for (const r of d.semanas) {
          const [, m, dd] = r.semana.split("-");
          const e = sem.get(r.semana) ?? { semana: `${dd}/${m}` };
          e[r.momento] = r.n;
          sem.set(r.semana, e);
        }
        const horas: number[] = d.diaHora.map((r: any) => r.hora);
        const h0 = horas.length ? Math.min(...horas) : 7;
        const h1 = horas.length ? Math.max(...horas) : 17;
        const columnas = Array.from({ length: h1 - h0 + 1 }, (_, i) => ({ id: String(h0 + i), nombre: `${h0 + i}h` }));
        const usados = new Set<number>(d.diaHora.map((r: any) => r.dia));
        const filas = DIAS.map((n, i) => ({ id: String(i + 1), nombre: n })).filter((f) => Number(f.id) <= 5 || usados.has(Number(f.id)));
        const cuenta = new Map<string, number>(d.diaHora.map((r: any) => [`${r.dia}|${r.hora}`, r.n]));
        return (
          <>
            <Rejilla>
              <Panel titulo="Observaciones por semana" info="Cantidad de observaciones por semana, separadas en V1 y V2."><Barras datos={[...sem.values()]} x="semana" apilado series={[{ key: "V1", color: C.v1 }, { key: "V2", color: C.v2 }]} /></Panel>
              <Panel titulo="Promedio por mes" info="Promedio de todos los criterios valorados en las observaciones de cada mes."><Linea datos={d.meses} x="mes" dominio={[0, 4]} series={[{ key: "promedio", nombre: "Promedio", color: C.v2 }]} /></Panel>
              <Panel titulo="Duración de las observaciones" info="Cantidad de observaciones según su duración en minutos. La duración la registra el sistema."><Barras datos={d.duracion} x="rango" series={[{ key: "n", nombre: "Observaciones", color: C.o1 }]} /></Panel>
            </Rejilla>
            <Panel titulo="Día y hora de inicio" info="Mapa de calor con la cantidad de observaciones según el día de la semana (fila) y la hora en que empezaron (columna). Más oscuro, más observaciones.">
              <Matriz filas={filas} columnas={columnas} valor={(f, c) => cuenta.get(`${f}|${c}`) ?? 0} titulo="observaciones" />
            </Panel>
          </>
        );
      }}
    </Cuerpo>
  );
}

const FUENTES = [
  ["todo", "Todo"], ["respuestas", "Respuestas"], ["p1", "Pregunta 1"], ["p2", "Pregunta 2"], ["p3", "Pregunta 3"],
  ["p4", "Pregunta 4"], ["p5", "Pregunta 5"], ["p6", "Pregunta 6"], ["evidencia", "Evidencias"],
  ["sintesis", "Síntesis"], ["condiciones", "Condiciones"], ["tarea", "Tarea y recurso"],
] as const;

function HojaTexto({ qs }: { qs: string }) {
  const [fuente, setFuente] = useState<string>("todo");
  const estado = useAnalisis("texto", qs, `fuente=${fuente}`);
  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label="Fuente del texto">
        {FUENTES.map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={fuente === id}
            onClick={() => setFuente(id)}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm transition active:scale-[.97] ${fuente === id ? "border-primary bg-primary text-white" : "border-mist bg-white text-ink hover:border-accent"}`}
          >
            {nombre}
          </button>
        ))}
      </div>
      <Cuerpo estado={estado}>
        {(d) => (
          <Rejilla cols="lg:grid-cols-[2fr_1fr]">
            <Panel titulo="Palabras más repetidas" info="Cuanto más se repite una palabra en los textos escritos, más grande se ve. No se incluyen palabras comunes ni las que aparecen menos de 3 veces.">
              <Nube palabras={d.palabras} />
            </Panel>
            <Panel titulo="Las diez más frecuentes" info="Cantidad de veces que aparece cada palabra en la fuente elegida.">
              <BarrasLista items={d.palabras.slice(0, 10).map((p: any) => ({ etiqueta: p.palabra, valor: p.n }))} />
            </Panel>
          </Rejilla>
        )}
      </Cuerpo>
    </div>
  );
}
