import PDFDocument from "pdfkit";
import path from "node:path";
import { sql } from "./db";
import { ENCABEZADO, NIVELES, O1, O2, O3, O4, PREGUNTAS, SINTESIS, TEXTOS } from "./instrumento";
import type { Filtros } from "./resultados";

type Fila = Record<string, unknown>;
export type Datos = {
  obs: Fila[];
  scores: Map<number, Fila[]>;
  conds: Map<number, Fila[]>;
  resp: Map<number, Fila[]>;
};

const AZUL = "#094875";
const TINTA = "#27374d";
const GRIS = "#6b7a8a";
const MARGEN = 42;
const LOGOS = path.join(process.cwd(), "public", "logos");

const porObs = (rows: Fila[]) => {
  const m = new Map<number, Fila[]>();
  for (const r of rows) {
    const k = r.observation_id as number;
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return m;
};

/** Carga las observaciones (una por id, o todas las que cumplan los filtros) con sus tablas hijas. */
export async function cargarDatos(sel: { id: number } | { filtros: Filtros }): Promise<Datos> {
  const obs =
    "id" in sel
      ? await sql.query(
          `SELECT o.*, o.fecha::text AS fecha_txt, o.hora_inicio::text AS ini, o.hora_cierre::text AS fin, i.nombre AS ies_nombre
           FROM observations o JOIN ies i ON i.id = o.ies_id WHERE o.id = $1`,
          [sel.id]
        )
      : await sql.query(
          `SELECT o.*, o.fecha::text AS fecha_txt, o.hora_inicio::text AS ini, o.hora_cierre::text AS fin, i.nombre AS ies_nombre
           FROM observations o JOIN ies i ON i.id = o.ies_id
           WHERE ($1::text IS NULL OR i.codigo = $1) AND ($2::text IS NULL OR o.momento = $2) AND ($3::text IS NULL OR o.modalidad = $3)
           ORDER BY i.codigo, o.codigo_docente, o.momento, o.id`,
          [sel.filtros.ies, sel.filtros.momento, sel.filtros.modalidad]
        );
  const ids = obs.map((o) => o.id as number);
  const [scores, conds, resp] = await Promise.all([
    sql.query(`SELECT * FROM scores WHERE observation_id = ANY($1::int[]) ORDER BY criterio`, [ids]),
    sql.query(`SELECT * FROM condiciones WHERE observation_id = ANY($1::int[]) ORDER BY item`, [ids]),
    sql.query(`SELECT * FROM respuestas_abiertas WHERE observation_id = ANY($1::int[]) ORDER BY pregunta`, [ids]),
  ]);
  return { obs, scores: porObs(scores), conds: porObs(conds), resp: porObs(resp) };
}

function espacio(doc: PDFKit.PDFDocument, alto: number) {
  if (doc.y + alto > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function seccion(doc: PDFKit.PDFDocument, texto: string) {
  espacio(doc, 60);
  doc.moveDown(0.8);
  const y = doc.y;
  doc.rect(MARGEN, y, doc.page.width - MARGEN * 2, 3).fill(AZUL);
  doc.moveDown(0.5);
  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(10).text(texto.toUpperCase(), MARGEN, y + 9, { width: doc.page.width - MARGEN * 2 });
  doc.moveDown(0.4);
}

function parrafo(doc: PDFKit.PDFDocument, texto: string, o: { color?: string; size?: number; bold?: boolean } = {}) {
  doc.fillColor(o.color ?? TINTA).font(o.bold ? "Helvetica-Bold" : "Helvetica").fontSize(o.size ?? 9).text(texto, { lineGap: 1.5 });
}

function etiquetaValor(doc: PDFKit.PDFDocument, etiqueta: string, valor: string) {
  espacio(doc, 24);
  doc.fillColor(GRIS).font("Helvetica").fontSize(7.5).text(etiqueta.toUpperCase(), { lineGap: 0 });
  doc.fillColor(TINTA).font("Helvetica").fontSize(9.5).text(valor || "—", { lineGap: 1.5 });
  doc.moveDown(0.35);
}

function escribirObservacion(doc: PDFKit.PDFDocument, d: Datos, o: Fila) {
  const id = o.id as number;
  const scores = d.scores.get(id) ?? [];
  const conds = d.conds.get(id) ?? [];
  const resp = d.resp.get(id) ?? [];
  const ancho = doc.page.width - MARGEN * 2;

  // Logos y título
  try {
    doc.image(path.join(LOGOS, "upd.png"), MARGEN, MARGEN - 8, { height: 30 });
    doc.image(path.join(LOGOS, "anii.png"), doc.page.width - MARGEN - 110, MARGEN, { width: 110 });
  } catch {}
  doc.y = MARGEN + 34;
  doc.x = MARGEN;
  parrafo(doc, ENCABEZADO.proyecto, { color: GRIS, size: 6.5 });
  doc.moveDown(0.3);
  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(13).text(ENCABEZADO.titulo, { width: ancho });
  parrafo(doc, ENCABEZADO.version, { color: GRIS, size: 7 });
  doc.moveDown(0.4);
  for (const [t, cuerpo] of [["Propósito. ", ENCABEZADO.proposito], ["Carácter de la aplicación. ", ENCABEZADO.caracter]] as const) {
    doc.fillColor(TINTA).font("Helvetica-Bold").fontSize(8.5).text(t, { continued: true, lineGap: 1.5 });
    doc.font("Helvetica").text(cuerpo, { lineGap: 1.5 });
    doc.moveDown(0.2);
  }

  // Datos de la visita
  seccion(doc, "Datos de la visita");
  const datos: [string, string][] = [
    ["Institución (IES)", `${o.ies_nombre}`],
    ["Código de docente", `${o.codigo_docente}`],
    ["Código de mentor o mentora", `${o.codigo_mentor}`],
    ["Asignatura o experiencia acompañada", `${o.asignatura}`],
    ["Código de cátedra", `${o.codigo_catedra}`],
    ["Momento de aplicación", `${o.momento}`],
    ["Fecha", `${o.fecha_txt}`],
    ["Hora de inicio / cierre", `${String(o.ini).slice(0, 5)} / ${String(o.fin).slice(0, 5)}`],
    ["Duración de la observación", `${o.duracion_min} minutos`],
    ["Código único del caso", `${o.codigo_caso}`],
    ["Modalidad de observación", `${o.modalidad}`],
  ];
  for (const [k, v] of datos) etiquetaValor(doc, k, v);
  etiquetaValor(doc, "Tarea o segmento observado y resultado de aprendizaje previsto", `${o.tarea_resultado ?? ""}`);
  etiquetaValor(doc, "Metodología activa y recurso digital utilizado, si lo hubo", `${o.metodologia_recurso ?? ""}`);

  // O1, O2, O3
  for (const dim of [O1, O2, O3]) {
    seccion(doc, `${dim.id}: ${dim.titulo}`);
    for (const c of dim.criterios) {
      const s = scores.find((x) => x.criterio === c.id);
      espacio(doc, 70);
      doc.fillColor(TINTA).font("Helvetica-Bold").fontSize(9.5).text(`${c.id}  ${c.nombre}`);
      if (s?.estado === "valor" && typeof s.nivel === "number") {
        doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(9).text(`Nivel ${s.nivel} · ${NIVELES[s.nivel - 1]}`);
        parrafo(doc, c.niveles[s.nivel - 1], { size: 8.5 });
      } else {
        parrafo(doc, s?.estado === "NO" ? "NO · Falta evidencia" : s?.estado === "NA" ? "NA · No aplica" : "Sin valorar", { color: GRIS, bold: true });
      }
      if (s?.evidencia) parrafo(doc, `Evidencia y justificación: ${s.evidencia}`, { color: GRIS, size: 8.5 });
      doc.moveDown(0.5);
    }
  }

  // O4
  seccion(doc, "O4: Condiciones y ambiente de la sesión (información contextual, no se puntúa)");
  parrafo(doc, TEXTOS.o4, { color: GRIS, size: 8 });
  doc.moveDown(0.3);
  for (const it of O4) {
    const c = conds.find((x) => x.item === it.item);
    espacio(doc, 40);
    doc.fillColor(TINTA).font("Helvetica-Bold").fontSize(9.5).text(`${it.item}  ${it.titulo}`);
    parrafo(doc, `${c?.opcion ?? "—"}${c?.origen ? `  ·  Origen: ${c.origen}` : ""}`);
    if (c?.descripcion) parrafo(doc, `Descripción: ${c.descripcion}`, { color: GRIS, size: 8.5 });
    doc.moveDown(0.4);
  }

  // Preguntas abiertas
  seccion(doc, "Preguntas abiertas");
  PREGUNTAS.forEach((p, i) => {
    if (i === 4) {
      doc.moveDown(0.3);
      parrafo(doc, TEXTOS.preguntasIa, { bold: true });
      doc.moveDown(0.2);
    }
    espacio(doc, 40);
    doc.fillColor(TINTA).font("Helvetica-Bold").fontSize(8.5).text(`${i + 1}. ${p}`);
    parrafo(doc, `${resp.find((r) => r.pregunta === i + 1)?.respuesta ?? "—"}`);
    doc.moveDown(0.4);
  });

  // Resultado de la observación (uso del equipo del proyecto)
  seccion(doc, "Resultado de la observación");
  etiquetaValor(doc, "Clasificación (uso del equipo del proyecto)", `${o.clasificacion ?? "—"}`);
  etiquetaValor(doc, "Evidencia de aula y material autorizado de esta experiencia", `${o.evidencia_aula ?? ""}`);
  etiquetaValor(doc, "Comparación V1 y V2 con ambas fichas", `${o.comparacion_v1_v2 ?? ""}`);
  etiquetaValor(doc, "Diferencias de tarea, duración, modalidad u otras condiciones", `${o.diferencias ?? ""}`);

  // Síntesis
  const sint = (o.sintesis ?? {}) as Record<string, string>;
  seccion(doc, TEXTOS.sintesisTitulo);
  for (const s of SINTESIS) etiquetaValor(doc, s.titulo, sint[s.clave] ?? "");

  // Firma
  const firma = o.firma as string | null;
  if (firma?.startsWith("data:image/png;base64,")) {
    espacio(doc, 110);
    doc.moveDown(0.6);
    try {
      doc.image(Buffer.from(firma.split(",")[1], "base64"), MARGEN, doc.y, { fit: [200, 70] });
      doc.y += 74;
    } catch {}
    doc.strokeColor(GRIS).lineWidth(0.5).moveTo(MARGEN, doc.y).lineTo(MARGEN + 200, doc.y).stroke();
    doc.moveDown(0.2);
    parrafo(doc, "Firma", { color: GRIS, size: 8 });
  }
}

/** Devuelve un flujo PDF con una observación por bloque de páginas. */
export function crearPdf(d: Datos, titulo: string): ReadableStream<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: MARGEN, info: { Title: titulo, Author: "UPD · ANII CEIBAL" } });
  return new ReadableStream({
    start(controller) {
      doc.on("data", (c: Buffer) => controller.enqueue(new Uint8Array(c)));
      doc.on("end", () => controller.close());
      doc.on("error", (e) => controller.error(e));
      d.obs.forEach((o, i) => {
        if (i > 0) doc.addPage();
        escribirObservacion(doc, d, o);
      });
      if (!d.obs.length) doc.font("Helvetica").fontSize(11).text("Sin observaciones");
      doc.end();
    },
  });
}
