"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MODALIDADES, MOMENTOS } from "@/lib/criterios";
import {
  COMPARACION, ENCABEZADO, NIVELES, O1, O2, O3, O4, PREGUNTAS, SINTESIS, TEXTOS,
  type Criterio, type Dimension, type ItemCondicion,
} from "@/lib/instrumento";
import { Area, Aviso, Campo, Chips, FirmaPad, OpcionTarjeta, Plegable, Texto, type Score } from "./ui";

type Cond = { opcion: string; origen: string[]; descripcion: string };
type Estado = {
  aval: boolean | null;
  /** Momento (ms) en que se confirmó el aval: marca el inicio de la observación. */
  inicioTs: number | null;
  firma: string;
  ies: string;
  docente: string;
  mentor: string;
  asignatura: string;
  catedra: string;
  momento: string;
  fecha: string;
  modalidad: string;
  tarea: string;
  metodologia: string;
  scores: Record<string, Score>;
  cond: Record<string, Cond>;
  resp: string[];
  evidenciaAula: string;
  comparacion: string;
  diferencias: string;
  sintesis: Record<string, string>;
};
type Errores = Record<string, string>;
type IesOpt = { codigo: string; nombre: string };

// Una pantalla por pregunta.
type Pantalla =
  | { t: "visita" }
  | { t: "criterio"; dim: Dimension; c: Criterio }
  | { t: "cond"; item: ItemCondicion }
  | { t: "pregunta"; i: number }
  | { t: "evidencia" }
  | { t: "sintesis" };

const SECCIONES = ["Visita", "O1", "O2", "O3", "O4", "Diálogo", "Evidencia", "Síntesis"] as const;
const PANTALLAS: Pantalla[] = [
  { t: "visita" },
  ...[O1, O2, O3].flatMap((dim) => dim.criterios.map((c) => ({ t: "criterio", dim, c }) as Pantalla)),
  ...O4.map((item) => ({ t: "cond", item }) as Pantalla),
  ...PREGUNTAS.map((_, i) => ({ t: "pregunta", i }) as Pantalla),
  { t: "evidencia" },
  { t: "sintesis" },
];
const seccionDe = (p: Pantalla) =>
  p.t === "visita" ? 0 : p.t === "criterio" ? Number(p.dim.id[1]) : p.t === "cond" ? 4 : p.t === "pregunta" ? 5 : p.t === "evidencia" ? 6 : 7;
const SEC_INICIO = SECCIONES.map((_, s) => PANTALLAS.findIndex((p) => seccionDe(p) === s));
const SEC_TOTAL = SECCIONES.map((_, s) => PANTALLAS.filter((p) => seccionDe(p) === s).length);

const CLAVE = "upd-i03-borrador-v2";
const AVANCE_MS = 450;
const ahora = () => Date.now();


const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const vacio = (): Estado => ({
  aval: null, inicioTs: null, firma: "", ies: "", docente: "", mentor: "", asignatura: "", catedra: "", momento: "", fecha: hoy(),
  modalidad: "", tarea: "", metodologia: "",
  scores: Object.fromEntries([...O1.criterios, ...O2.criterios, ...O3.criterios].map((c) => [c.id, { estado: null, nivel: null, evidencia: "" }])),
  cond: Object.fromEntries(O4.map((i) => [i.item, { opcion: "", origen: [], descripcion: "" }])),
  resp: PREGUNTAS.map(() => ""),
  evidenciaAula: "", comparacion: "", diferencias: "", sintesis: {},
});

function cargar(): { e: Estado; paso: number } {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const j = JSON.parse(raw);
      return { e: { ...vacio(), ...j.e }, paso: Math.min(j.paso ?? 0, PANTALLAS.length - 1) };
    }
  } catch {}
  return { e: vacio(), paso: 0 };
}

function validar(p: Pantalla, e: Estado): Errores {
  const er: Errores = {};
  const req = (k: keyof Estado, v: string) => { if (!v.trim()) er[k] = "Requerido"; };
  if (p.t === "visita") {
    if (e.aval === null) er.aval = "Confirma el aval ético";
    else if (e.aval === false) er.aval = "Sin aval ético no se puede continuar";
    if (e.aval === true && !e.firma) er.firma = "Firma requerida";
    req("ies", e.ies); req("docente", e.docente); req("mentor", e.mentor); req("asignatura", e.asignatura);
    req("catedra", e.catedra); req("momento", e.momento); req("fecha", e.fecha);
    req("modalidad", e.modalidad); req("tarea", e.tarea);
  } else if (p.t === "criterio") {
    if (e.scores[p.c.id].estado === null) er[p.c.id] = "Elige un nivel, NO" + (p.c.na ? " o NA" : "");
  } else if (p.t === "cond") {
    if (!e.cond[p.item.item].opcion) er[p.item.item] = "Elige una opción";
  }
  return er;
}

export default function Formulario() {
  const [ini] = useState(cargar);
  const [e, setE] = useState<Estado>(ini.e);
  const [paso, setPaso] = useState(ini.paso);
  const [err, setErr] = useState<Errores>({});
  const [ies, setIes] = useState<IesOpt[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [falla, setFalla] = useState("");
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const trampa = useRef<HTMLInputElement>(null);
  const tope = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pantalla = PANTALLAS[paso];
  const sec = seccionDe(pantalla);

  useEffect(() => {
    fetch("/api/ies").then((r) => r.json()).then(setIes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!listo) {
      try { localStorage.setItem(CLAVE, JSON.stringify({ e, paso })); } catch {}
    }
  }, [e, paso, listo]);

  const cancelarAvance = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const ir = (n: number) => {
    cancelarAvance();
    setPaso(Math.max(0, Math.min(PANTALLAS.length - 1, n)));
    tope.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  /** Pasa a la siguiente pregunta tras responder, salvo que el usuario ya haya abierto el texto opcional. */
  const avanzarSolo = (desde: number, abierto: boolean, conTexto: boolean) => {
    cancelarAvance();
    if (abierto || conTexto) return;
    timer.current = setTimeout(() => {
      setPaso((p) => (p === desde ? p + 1 : p));
      tope.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, AVANCE_MS);
  };

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => {
    setE((p) => ({ ...p, [k]: v }));
    if (err[k as string]) setErr((p) => ({ ...p, [k]: "" }));
  };
  const setScore = (id: string, s: Score) => {
    setE((p) => ({ ...p, scores: { ...p.scores, [id]: s } }));
    if (err[id]) setErr((p) => ({ ...p, [id]: "" }));
  };
  const setCond = (item: string, c: Partial<Cond>) => {
    setE((p) => ({ ...p, cond: { ...p.cond, [item]: { ...p.cond[item], ...c } } }));
    if (err[item]) setErr((p) => ({ ...p, [item]: "" }));
  };
  const elegirAval = (v: boolean) => {
    // La observación inicia al confirmar el aval: ahí empieza a contar el tiempo.
    const t = ahora();
    setE((p) => ({ ...p, aval: v, inicioTs: v ? (p.inicioTs ?? t) : p.inicioTs }));
    if (err.aval) setErr((p) => ({ ...p, aval: "" }));
  };

  const siguiente = () => {
    const er = validar(pantalla, e);
    setErr(er);
    if (Object.values(er).some(Boolean)) {
      requestAnimationFrame(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    ir(paso + 1);
  };

  const codigoCaso = [e.ies, e.docente, e.momento, e.catedra].filter(Boolean).join("-");

  const enviar = async () => {
    for (let i = 0; i < PANTALLAS.length; i++) {
      const er = validar(PANTALLAS[i], e);
      if (Object.values(er).some(Boolean)) {
        setErr(er);
        ir(i);
        return;
      }
    }
    setEnviando(true);
    setFalla("");
    // El sistema registra las horas: inicio al confirmar el aval, cierre al enviar.
    const cierre = ahora();
    const inicio = e.inicioTs ?? cierre;
    const payload = {
      aval_etico: e.aval,
      firma: e.firma,
      ies_codigo: e.ies,
      codigo_docente: e.docente.trim(),
      codigo_mentor: e.mentor.trim(),
      asignatura: e.asignatura.trim(),
      codigo_catedra: e.catedra.trim(),
      momento: e.momento,
      fecha: e.fecha,
      hora_inicio: hhmm(inicio),
      hora_cierre: hhmm(cierre),
      duracion_min: Math.max(1, Math.round((cierre - inicio) / 60000)),
      modalidad: e.modalidad,
      tarea_resultado: e.tarea.trim(),
      metodologia_recurso: e.metodologia.trim(),
      scores: Object.entries(e.scores).map(([criterio, s]) => ({
        criterio,
        estado: s.estado,
        nivel: s.estado === "valor" ? s.nivel : null,
        ...(s.evidencia.trim() ? { evidencia: s.evidencia.trim() } : {}),
      })),
      condiciones: Object.entries(e.cond).map(([item, c]) => ({
        item,
        opcion: c.opcion,
        ...(c.origen.length ? { origen: c.origen.join(", ") } : {}),
        ...(c.descripcion.trim() ? { descripcion: c.descripcion.trim() } : {}),
      })),
      respuestas: e.resp.map((r, i) => ({ pregunta: i + 1, respuesta: r.trim() })).filter((r) => r.respuesta),
      evidencia_aula: e.evidenciaAula.trim(),
      comparacion_v1_v2: e.comparacion || undefined,
      diferencias: e.diferencias.trim() || undefined,
      sintesis: Object.fromEntries(Object.entries(e.sintesis).filter(([, v]) => v.trim())),
      sitio_web: trampa.current?.value ?? "",
    };
    try {
      const r = await fetch("/api/observaciones", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        try { localStorage.removeItem(CLAVE); } catch {}
        setPdfUrl(typeof j.pdf === "string" ? j.pdf : null);
        setListo(true);
      } else if (r.status === 422 && j.campos) {
        const raiz = (Object.keys(j.campos)[0] ?? "").split(".")[0];
        setErr({ [raiz]: Object.values(j.campos)[0] as string });
        setFalla("Revisa los datos marcados");
        ir(0);
      } else {
        setFalla(r.status === 429 ? "Demasiados envíos, intenta en unos minutos" : "No se pudo guardar. Intenta de nuevo");
      }
    } catch {
      setFalla("Sin conexión. Intenta de nuevo");
    } finally {
      setEnviando(false);
    }
  };

  const nueva = () => {
    setE(vacio());
    setErr({});
    setAbiertos({});
    setPaso(0);
    setListo(false);
    setPdfUrl(null);
  };

  if (listo) {
    return (
      <Marco>
        <div className="flex flex-col items-center gap-5 py-24 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
          </span>
          <h2 className="text-xl font-medium text-primary">Observación guardada</h2>
          {pdfUrl && (
            <a
              href={pdfUrl}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-primary px-6 text-sm font-medium text-primary transition hover:bg-mist/50 active:scale-[.98]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
              Descargar PDF
            </a>
          )}
          <button onClick={nueva} className="h-12 rounded-xl bg-primary px-6 text-sm font-medium text-white transition hover:bg-primary-dark active:scale-[.98]">
            Nueva observación
          </button>
        </div>
      </Marco>
    );
  }

  const ultima = paso === PANTALLAS.length - 1;
  const posicion = paso - SEC_INICIO[sec] + 1;

  return (
    <Marco
      cabecera={
        <div className="mx-auto max-w-2xl px-4 pb-3 sm:px-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-primary">{SECCIONES[sec]}</span>
            <span className="text-ink/50">{posicion} / {SEC_TOTAL[sec]}</span>
          </div>
          <div className="mt-2 flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={PANTALLAS.length - 1} aria-valuenow={paso}>
            {SECCIONES.map((nombre, s) => {
              const hechas = Math.max(0, Math.min(SEC_TOTAL[s], paso - SEC_INICIO[s] + (s === sec ? 1 : 0)));
              const alcanzada = SEC_INICIO[s] <= paso;
              return (
                <button
                  key={nombre}
                  type="button"
                  aria-label={nombre}
                  disabled={!alcanzada}
                  onClick={() => ir(SEC_INICIO[s])}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist"
                >
                  <span className="block h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(hechas / SEC_TOTAL[s]) * 100}%` }} />
                </button>
              );
            })}
          </div>
        </div>
      }
      pie={
        <div className="mx-auto flex max-w-2xl gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => ir(paso - 1)}
            disabled={paso === 0}
            className="h-12 rounded-xl border border-mist bg-white px-5 text-sm font-medium text-ink transition hover:border-ink/30 disabled:opacity-30"
          >
            Atrás
          </button>
          {!ultima ? (
            <button type="button" onClick={siguiente} className="h-12 flex-1 rounded-xl bg-primary text-sm font-medium text-white transition hover:bg-primary-dark active:scale-[.98]">
              Siguiente
            </button>
          ) : (
            <button type="button" onClick={enviar} disabled={enviando} className="h-12 flex-1 rounded-xl bg-secondary text-sm font-semibold text-ink transition hover:brightness-95 active:scale-[.98] disabled:opacity-60">
              {enviando ? "Guardando…" : "Enviar"}
            </button>
          )}
        </div>
      }
    >
      <div ref={tope} className="scroll-mt-32" />
      <div key={paso} className="animate-[entrada_.25s_ease-out] space-y-4">
        {pantalla.t === "visita" && (
          <div className="space-y-5">
            <Encabezado />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/80">{ENCABEZADO.aval}</span>
              <div className="flex gap-2">
                {([["Sí", true], ["No", false]] as const).map(([t, v]) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={e.aval === v}
                    onClick={() => elegirAval(v)}
                    className={`h-12 w-24 rounded-xl border text-sm font-medium transition active:scale-[.97] ${
                      e.aval === v ? (v ? "border-primary bg-primary text-white" : "border-[#c2410c] bg-[#c2410c] text-white") : "border-mist bg-white text-ink hover:border-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Aviso texto={err.aval} />
              <p className="mt-2 text-sm text-ink/60">{ENCABEZADO.avalNota}</p>
            </div>

            {e.aval === true && (
              <div className="animate-[entrada_.25s_ease-out]">
                <span className="mb-1.5 block text-sm font-medium text-ink/80">Firma</span>
                <FirmaPad valor={e.firma} onChange={(v) => set("firma", v)} error={err.firma} />
              </div>
            )}

            <Campo etiqueta="Institución (IES)" error={err.ies}>
              <select
                value={e.ies}
                onChange={(ev) => set("ies", ev.target.value)}
                className={`h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${err.ies ? "border-[#c2410c]" : "border-mist"}`}
              >
                <option value="">Selecciona</option>
                {ies.map((i) => <option key={i.codigo} value={i.codigo}>{i.nombre}</option>)}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Código de IES"><div className="flex h-12 items-center rounded-xl bg-mist/50 px-3 text-ink/70">{e.ies || "—"}</div></Campo>
              <Campo etiqueta="Código de cátedra" error={err.catedra}><Texto valor={e.catedra} onChange={(v) => set("catedra", v)} error={err.catedra} autoCapitalize="characters" /></Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Código de docente" error={err.docente}><Texto valor={e.docente} onChange={(v) => set("docente", v)} error={err.docente} autoCapitalize="characters" /></Campo>
              <Campo etiqueta="Código de mentor o mentora" error={err.mentor}><Texto valor={e.mentor} onChange={(v) => set("mentor", v)} error={err.mentor} autoCapitalize="characters" /></Campo>
            </div>
            <Campo etiqueta="Asignatura o experiencia acompañada" error={err.asignatura}><Texto valor={e.asignatura} onChange={(v) => set("asignatura", v)} error={err.asignatura} /></Campo>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/80">Momento de aplicación</span>
              <Chips opciones={MOMENTOS} valor={e.momento} onChange={(v) => set("momento", v)} error={err.momento} />
            </div>
            <Campo etiqueta="Fecha" error={err.fecha}><Texto type="date" valor={e.fecha} onChange={(v) => set("fecha", v)} error={err.fecha} /></Campo>
            <Campo etiqueta="Código único del caso"><div className="flex h-12 items-center truncate rounded-xl bg-mist/50 px-3 text-sm text-ink/70">{codigoCaso || "—"}</div></Campo>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/80">Modalidad de observación</span>
              <Chips opciones={MODALIDADES} valor={e.modalidad} onChange={(v) => set("modalidad", v)} error={err.modalidad} />
            </div>
            <Campo etiqueta="Tarea o segmento observado y resultado de aprendizaje previsto" error={err.tarea}><Area valor={e.tarea} onChange={(v) => set("tarea", v)} error={err.tarea} /></Campo>
            <Campo etiqueta="Metodología activa y recurso digital utilizado, si lo hubo"><Area valor={e.metodologia} onChange={(v) => set("metodologia", v)} filas={2} /></Campo>
          </div>
        )}

        {pantalla.t === "criterio" && (
          <PCriterio
            dim={pantalla.dim}
            c={pantalla.c}
            s={e.scores[pantalla.c.id]}
            abierto={!!abiertos[pantalla.c.id]}
            error={err[pantalla.c.id]}
            onElegir={(n) => {
              setScore(pantalla.c.id, n);
              avanzarSolo(paso, !!abiertos[pantalla.c.id], !!n.evidencia);
            }}
            onAbrir={() => { cancelarAvance(); setAbiertos((x) => ({ ...x, [pantalla.c.id]: true })); }}
            onEvidencia={(v) => { cancelarAvance(); setScore(pantalla.c.id, { ...e.scores[pantalla.c.id], evidencia: v }); }}
          />
        )}

        {pantalla.t === "cond" && (
          <PCond
            item={pantalla.item}
            c={e.cond[pantalla.item.item]}
            abierto={!!abiertos[pantalla.item.item]}
            error={err[pantalla.item.item]}
            onCambio={(parcial, avanzar) => {
              setCond(pantalla.item.item, parcial);
              if (avanzar) avanzarSolo(paso, !!abiertos[pantalla.item.item], !!e.cond[pantalla.item.item].descripcion);
            }}
            onAbrir={() => { cancelarAvance(); setAbiertos((x) => ({ ...x, [pantalla.item.item]: true })); }}
            onDescripcion={(v) => { cancelarAvance(); setCond(pantalla.item.item, { descripcion: v }); }}
          />
        )}

        {pantalla.t === "pregunta" && (
          <PPregunta
            i={pantalla.i}
            valor={e.resp[pantalla.i]}
            onChange={(v) => setE((x) => ({ ...x, resp: x.resp.map((r, j) => (j === pantalla.i ? v : r)) }))}
          />
        )}

        {pantalla.t === "evidencia" && (
          <div className="space-y-5">
            <Campo etiqueta="Evidencia de aula y material autorizado de esta experiencia"><Area valor={e.evidenciaAula} onChange={(v) => set("evidenciaAula", v)} /></Campo>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/80">Comparación V1 y V2 con ambas fichas</span>
              <Chips opciones={COMPARACION} valor={e.comparacion} onChange={(v) => set("comparacion", e.comparacion === v ? "" : v)} />
            </div>
            <Campo etiqueta="Diferencias de tarea, duración, modalidad u otras condiciones"><Area valor={e.diferencias} onChange={(v) => set("diferencias", v)} /></Campo>
          </div>
        )}

        {pantalla.t === "sintesis" && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold uppercase leading-snug tracking-wide text-primary">{TEXTOS.sintesisTitulo}</h2>
            <p className="text-sm leading-relaxed text-ink/70">{TEXTOS.sintesis}</p>
            {SINTESIS.map((s) => (
              <Campo key={s.clave} etiqueta={s.titulo} ayuda={s.ayuda}>
                <Area
                  valor={e.sintesis[s.clave] ?? ""}
                  onChange={(v) => setE((x) => ({ ...x, sintesis: { ...x.sintesis, [s.clave]: v } }))}
                />
              </Campo>
            ))}
            <Aviso texto={falla} />
          </div>
        )}
      </div>

      {/* Campo trampa contra bots: fuera de pantalla y fuera del orden de tabulación. */}
      <input ref={trampa} name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
    </Marco>
  );
}

function PCriterio({ dim, c, s, abierto, error, onElegir, onAbrir, onEvidencia }: {
  dim: Dimension;
  c: Criterio;
  s: Score;
  abierto: boolean;
  error?: string;
  onElegir: (s: Score) => void;
  onAbrir: () => void;
  onEvidencia: (v: string) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-xs font-semibold uppercase leading-snug tracking-wide text-primary">{dim.id}: {dim.titulo}</h2>
        {dim.intro && <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{dim.intro}</p>}
      </div>
      {c.antes && (
        <div>
          <h3 className="text-base font-semibold text-ink">{c.antes.titulo}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">{c.antes.texto}</p>
        </div>
      )}
      <h3 className="text-xl font-semibold leading-snug text-ink">
        <span className="mr-2 text-primary">{c.id}</span>
        {c.nombre}
      </h3>
      <div role="radiogroup" aria-label={c.nombre} className="space-y-2.5">
        {NIVELES.map((n, i) => (
          <OpcionTarjeta
            key={n}
            marca={String(i + 1)}
            titulo={n}
            texto={c.niveles[i]}
            activa={s.estado === "valor" && s.nivel === i + 1}
            onClick={() => onElegir({ ...s, estado: "valor", nivel: i + 1 })}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {(c.na ? (["NO", "NA"] as const) : (["NO"] as const)).map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={s.estado === x}
            onClick={() => onElegir({ ...s, estado: x, nivel: null })}
            className={`h-11 min-w-16 rounded-xl border px-4 text-sm font-medium transition active:scale-[.97] ${
              s.estado === x ? "border-ink bg-ink text-white" : "border-mist bg-white text-ink/70 hover:border-ink/40"
            }`}
          >
            {x}
            <span className="ml-1.5 hidden text-xs font-normal opacity-70 sm:inline">{x === "NO" ? "falta evidencia" : "no aplica"}</span>
          </button>
        ))}
      </div>
      <Aviso texto={error} />
      <Plegable etiqueta="Evidencia y justificación" valor={s.evidencia} abierto={abierto} onAbrir={onAbrir} onChange={onEvidencia} />
    </>
  );
}

function PCond({ item, c, abierto, error, onCambio, onAbrir, onDescripcion }: {
  item: ItemCondicion;
  c: Cond;
  abierto: boolean;
  error?: string;
  onCambio: (parcial: Partial<Cond>, avanzar: boolean) => void;
  onAbrir: () => void;
  onDescripcion: (v: string) => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-xs font-semibold uppercase leading-snug tracking-wide text-primary">O4: Condiciones y ambiente de la sesión (información contextual, no se puntúa)</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{TEXTOS.o4}</p>
      </div>
      <h3 className="text-xl font-semibold leading-snug text-ink">
        <span className="mr-2 text-primary">{item.item}</span>
        {item.titulo}
      </h3>
      <div role="radiogroup" aria-label={item.titulo} className="space-y-2.5">
        {item.opciones.map((o, i) => (
          <OpcionTarjeta
            key={o}
            marca={String.fromCharCode(65 + i)}
            texto={o}
            activa={c.opcion === o}
            // 4.2 pide además el origen: ahí se avanza con Siguiente.
            onClick={() => onCambio({ opcion: o }, !item.origen)}
          />
        ))}
      </div>
      <Aviso texto={error} />
      {item.origen && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink/80">Origen</span>
          <Chips
            multiple
            opciones={item.origen}
            valor={c.origen}
            onChange={(v) => onCambio({ origen: c.origen.includes(v) ? c.origen.filter((x) => x !== v) : [...c.origen, v] }, false)}
          />
        </div>
      )}
      <Plegable etiqueta="Descripción" valor={c.descripcion} abierto={abierto} onAbrir={onAbrir} onChange={onDescripcion} />
    </>
  );
}

function PPregunta({ i, valor, onChange }: { i: number; valor: string; onChange: (v: string) => void }) {
  return (
    <>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">{i >= 4 ? TEXTOS.preguntasIa : "Preguntas abiertas"}</h2>
        {i === 0 && <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{TEXTOS.preguntas}</p>}
      </div>
      <h3 className="text-xl font-semibold leading-snug text-ink">
        <span className="mr-2 text-primary">{i + 1}.</span>
        {PREGUNTAS[i]}
      </h3>
      <Area valor={valor} onChange={onChange} filas={6} />
    </>
  );
}

function Encabezado() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs leading-relaxed text-ink/50">{ENCABEZADO.proyecto}</p>
        <h1 className="mt-2 text-lg font-semibold leading-snug text-primary">{ENCABEZADO.titulo}</h1>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">{ENCABEZADO.version}</p>
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-4 text-sm leading-relaxed text-ink/80 ring-1 ring-mist">
        <p><b className="font-semibold text-ink">Propósito.</b> {ENCABEZADO.proposito}</p>
        <p><b className="font-semibold text-ink">Carácter de la aplicación.</b> {ENCABEZADO.caracter}</p>
      </div>
      <details className="group rounded-2xl bg-white ring-1 ring-mist" open>
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-ink">
          Instrucciones para el observador
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-ink/80">
          <ol className="list-decimal space-y-1 pl-5">
            {ENCABEZADO.instrucciones.map((t) => <li key={t}>{t}</li>)}
          </ol>
          <p>{ENCABEZADO.instruccionesNota}</p>
        </div>
      </details>
    </div>
  );
}

function Marco({ children, cabecera, pie }: { children: React.ReactNode; cabecera?: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f6f9fb] pb-28">
      <header className="sticky top-0 z-10 border-b border-mist bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <Image src="/logos/upd.svg" alt="UPD" width={150} height={48} className="h-9 w-auto" unoptimized priority />
          <Image src="/logos/anii.png" alt="ANII" width={249} height={50} className="h-7 w-auto" unoptimized priority />
        </div>
        {cabecera}
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6">{children}</main>
      {pie && <div className="fixed inset-x-0 bottom-0 z-10 border-t border-mist bg-white/95 backdrop-blur">{pie}</div>}
    </div>
  );
}
