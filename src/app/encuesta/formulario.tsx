"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MODALIDADES, MOMENTOS } from "@/lib/criterios";
import { COMPARACION, ENCABEZADO, O1, O2, O3, O4, PREGUNTAS, SINTESIS, TEXTOS, type Dimension } from "@/lib/instrumento";
import { Area, Aviso, Campo, Chips, FirmaPad, Texto, TarjetaCriterio, type Score } from "./ui";

type Cond = { opcion: string; origen: string[]; descripcion: string };
type Estado = {
  aval: boolean | null;
  firma: string;
  ies: string;
  docente: string;
  mentor: string;
  asignatura: string;
  catedra: string;
  momento: string;
  fecha: string;
  inicio: string;
  cierre: string;
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

const CLAVE = "upd-i03-borrador";
const PASOS = ["Visita", "O1", "O2", "O3", "O4", "Diálogo", "Evidencia", "Síntesis"] as const;
const DIMS: Record<number, Dimension> = { 1: O1, 2: O2, 3: O3 };

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const vacio = (): Estado => ({
  aval: null, firma: "", ies: "", docente: "", mentor: "", asignatura: "", catedra: "", momento: "", fecha: hoy(),
  inicio: "", cierre: "", modalidad: "", tarea: "", metodologia: "",
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
      return { e: { ...vacio(), ...j.e }, paso: Math.min(j.paso ?? 0, PASOS.length - 1) };
    }
  } catch {}
  return { e: vacio(), paso: 0 };
}

const minutos = (a: string, b: string) => {
  if (!a || !b) return null;
  const [h1, m1] = a.split(":").map(Number);
  const [h2, m2] = b.split(":").map(Number);
  const d = h2 * 60 + m2 - (h1 * 60 + m1);
  return d > 0 ? d : null;
};

function validar(paso: number, e: Estado): Errores {
  const er: Errores = {};
  const req = (k: keyof Estado, v: string) => { if (!v.trim()) er[k] = "Requerido"; };
  if (paso === 0) {
    if (e.aval === null) er.aval = "Confirma el aval ético";
    else if (e.aval === false) er.aval = "Sin aval ético no se puede continuar";
    if (e.aval === true && !e.firma) er.firma = "Firma requerida";
    req("ies", e.ies); req("docente", e.docente); req("mentor", e.mentor); req("asignatura", e.asignatura);
    req("catedra", e.catedra); req("momento", e.momento); req("fecha", e.fecha); req("inicio", e.inicio);
    req("modalidad", e.modalidad); req("tarea", e.tarea);
    if (!er.cierre && !e.cierre) er.cierre = "Requerido";
    else if (e.inicio && e.cierre && !minutos(e.inicio, e.cierre)) er.cierre = "Debe ser posterior al inicio";
  } else if (paso >= 1 && paso <= 3) {
    for (const c of DIMS[paso].criterios) if (e.scores[c.id].estado === null) er[c.id] = "Elige un nivel, NO" + (c.na ? " o NA" : "");
  } else if (paso === 4) {
    for (const i of O4) if (!e.cond[i.item].opcion) er[i.item] = "Elige una opción";
  }
  return er;
}

const PASO_DE: Record<string, number> = {
  aval_etico: 0, firma: 0, ies_codigo: 0, codigo_docente: 0, codigo_mentor: 0, asignatura: 0, codigo_catedra: 0, momento: 0,
  fecha: 0, hora_inicio: 0, hora_cierre: 0, modalidad: 0, tarea_resultado: 0,
};

export default function Formulario() {
  const [ini] = useState(cargar);
  const [e, setE] = useState<Estado>(ini.e);
  const [paso, setPaso] = useState(ini.paso);
  const [err, setErr] = useState<Errores>({});
  const [ies, setIes] = useState<IesOpt[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [guardadoId, setGuardadoId] = useState<number | null>(null);
  const [falla, setFalla] = useState("");
  const trampa = useRef<HTMLInputElement>(null);
  const tope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ies").then((r) => r.json()).then(setIes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!listo) {
      try { localStorage.setItem(CLAVE, JSON.stringify({ e, paso })); } catch {}
    }
  }, [e, paso, listo]);

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

  const ir = (n: number) => {
    setPaso(n);
    tope.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const siguiente = () => {
    const er = validar(paso, e);
    setErr(er);
    if (Object.values(er).some(Boolean)) {
      requestAnimationFrame(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    ir(paso + 1);
  };

  const duracion = minutos(e.inicio, e.cierre);
  const codigoCaso = [e.ies, e.docente, e.momento, e.catedra].filter(Boolean).join("-");

  const enviar = async () => {
    for (let p = 0; p <= 4; p++) {
      const er = validar(p, e);
      if (Object.values(er).some(Boolean)) {
        setErr(er);
        ir(p);
        return;
      }
    }
    setEnviando(true);
    setFalla("");
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
      hora_inicio: e.inicio,
      hora_cierre: e.cierre,
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
        setGuardadoId(typeof j.id === "number" ? j.id : null);
        setListo(true);
      } else if (r.status === 422 && j.campos) {
        const primero = Object.keys(j.campos)[0] ?? "";
        const raiz = primero.split(".")[0];
        setErr({ [raiz]: Object.values(j.campos)[0] as string });
        setFalla("Revisa los datos marcados");
        ir(PASO_DE[raiz] ?? 0);
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
    setPaso(0);
    setListo(false);
    setGuardadoId(null);
  };

  if (listo) {
    return (
      <Marco>
        <div className="flex flex-col items-center gap-5 py-24 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
          </span>
          <h2 className="text-xl font-medium text-primary">Observación guardada</h2>
          {guardadoId && (
            <a
              href={`/api/pdf?id=${guardadoId}`}
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

  return (
    <Marco
      cabecera={
        <div className="mx-auto max-w-2xl px-4 pb-3 sm:px-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-primary">{PASOS[paso]}</span>
            <span className="text-ink/50">{paso + 1} / {PASOS.length}</span>
          </div>
          <div className="mt-2 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={PASOS.length} aria-valuenow={paso + 1}>
            {PASOS.map((p, i) => (
              <button
                key={p}
                type="button"
                aria-label={p}
                disabled={i > paso}
                onClick={() => ir(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= paso ? "bg-primary" : "bg-mist"} ${i < paso ? "cursor-pointer" : ""}`}
              />
            ))}
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
          {paso < PASOS.length - 1 ? (
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
        {paso === 0 && (
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
                    onClick={() => set("aval", v)}
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
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Hora de inicio" error={err.inicio}><Texto type="time" valor={e.inicio} onChange={(v) => set("inicio", v)} error={err.inicio} /></Campo>
              <Campo etiqueta="Hora de cierre" error={err.cierre}><Texto type="time" valor={e.cierre} onChange={(v) => set("cierre", v)} error={err.cierre} /></Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Duración de la observación"><div className="flex h-12 items-center rounded-xl bg-mist/50 px-3 text-ink/70">{duracion ? `${duracion} minutos` : "—"}</div></Campo>
              <Campo etiqueta="Código único del caso"><div className="flex h-12 items-center truncate rounded-xl bg-mist/50 px-3 text-sm text-ink/70">{codigoCaso || "—"}</div></Campo>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/80">Modalidad de observación</span>
              <Chips opciones={MODALIDADES} valor={e.modalidad} onChange={(v) => set("modalidad", v)} error={err.modalidad} />
            </div>
            <Campo etiqueta="Tarea o segmento observado y resultado de aprendizaje previsto" error={err.tarea}><Area valor={e.tarea} onChange={(v) => set("tarea", v)} error={err.tarea} /></Campo>
            <Campo etiqueta="Metodología activa y recurso digital utilizado, si lo hubo"><Area valor={e.metodologia} onChange={(v) => set("metodologia", v)} filas={2} /></Campo>
          </div>
        )}

        {paso >= 1 && paso <= 3 && (
          <>
            <h2 className="text-base font-semibold uppercase leading-snug tracking-wide text-primary">{DIMS[paso].id}: {DIMS[paso].titulo}</h2>
            {DIMS[paso].intro && <p className="text-sm leading-relaxed text-ink/70">{DIMS[paso].intro}</p>}
            {DIMS[paso].criterios.map((c) => (
              <div key={c.id} className="space-y-4">
                {c.antes && (
                  <div className="pt-2">
                    <h3 className="text-base font-semibold text-ink">{c.antes.titulo}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">{c.antes.texto}</p>
                  </div>
                )}
                <TarjetaCriterio c={c} valor={e.scores[c.id]} onChange={(s) => setScore(c.id, s)} error={err[c.id]} />
              </div>
            ))}
          </>
        )}

        {paso === 4 && (
          <>
            <h2 className="text-base font-semibold uppercase leading-snug tracking-wide text-primary">O4: Condiciones y ambiente de la sesión (información contextual, no se puntúa)</h2>
            <p className="text-sm leading-relaxed text-ink/70">{TEXTOS.o4}</p>
            {O4.map((i) => (
              <section key={i.item} className={`space-y-3 rounded-2xl border bg-white p-4 sm:p-5 ${err[i.item] ? "border-[#c2410c]" : "border-mist"}`}>
                <h3 className="flex gap-3 text-base font-medium leading-snug text-ink">
                  <span className="mt-0.5 flex h-7 min-w-9 items-center justify-center rounded-lg bg-mist px-2 text-xs font-semibold">{i.item}</span>
                  {i.titulo}
                </h3>
                <Chips opciones={i.opciones} valor={e.cond[i.item].opcion} onChange={(v) => setCond(i.item, { opcion: v })} error={err[i.item]} />
                {i.origen && (
                  <div>
                    <span className="mb-1.5 block text-sm text-ink/60">Origen</span>
                    <Chips
                      multiple
                      opciones={i.origen}
                      valor={e.cond[i.item].origen}
                      onChange={(v) => {
                        const a = e.cond[i.item].origen;
                        setCond(i.item, { origen: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] });
                      }}
                    />
                  </div>
                )}
                <Area placeholder="Descripción" valor={e.cond[i.item].descripcion} onChange={(v) => setCond(i.item, { descripcion: v })} filas={2} />
              </section>
            ))}
          </>
        )}

        {paso === 5 && (
          <>
            <h2 className="text-base font-semibold uppercase tracking-wide text-primary">Preguntas abiertas</h2>
            <p className="text-sm leading-relaxed text-ink/70">{TEXTOS.preguntas}</p>
            {PREGUNTAS.map((p, i) => (
              <div key={i}>
                {i === 4 && <h3 className="mb-3 mt-4 text-base font-semibold text-ink">{TEXTOS.preguntasIa}</h3>}
                <Campo etiqueta={`${i + 1}. ${p}`}>
                  <Area valor={e.resp[i]} onChange={(v) => setE((x) => ({ ...x, resp: x.resp.map((r, j) => (j === i ? v : r)) }))} filas={3} />
                </Campo>
              </div>
            ))}
          </>
        )}

        {paso === 6 && (
          <div className="space-y-5">
            <Campo etiqueta="Evidencia de aula y material autorizado de esta experiencia"><Area valor={e.evidenciaAula} onChange={(v) => set("evidenciaAula", v)} /></Campo>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink/80">Comparación V1 y V2 con ambas fichas</span>
              <Chips opciones={COMPARACION} valor={e.comparacion} onChange={(v) => set("comparacion", e.comparacion === v ? "" : v)} />
            </div>
            <Campo etiqueta="Diferencias de tarea, duración, modalidad u otras condiciones"><Area valor={e.diferencias} onChange={(v) => set("diferencias", v)} /></Campo>
          </div>
        )}

        {paso === 7 && (
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
