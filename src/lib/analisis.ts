import { sql } from "./db";
import { MIN_GRUPO } from "./criterios";
import type { Filtros } from "./resultados";
import { PALABRAS_VACIAS } from "./palabras";

export const SECCIONES_ANALISIS = ["criterios", "ies", "docentes", "contexto", "modalidad", "tiempo", "texto"] as const;
export type SeccionAnalisis = (typeof SECCIONES_ANALISIS)[number];

const BASE = `FROM observations o JOIN ies i ON i.id = o.ies_id`;
const FILTRO = `WHERE ($1::text IS NULL OR i.codigo = $1)
  AND ($2::text IS NULL OR o.momento = $2)
  AND ($3::text IS NULL OR o.modalidad = $3)`;
const SCORES = `JOIN scores s ON s.observation_id = o.id AND s.estado = 'valor'`;
const IA = `EXISTS (SELECT 1 FROM scores x WHERE x.observation_id = o.id AND x.criterio LIKE '3.%' AND x.estado <> 'NA')`;

type Fila = Record<string, unknown>;
const nums = (rows: Fila[], ...claves: string[]) =>
  rows.map((r) => {
    const c = { ...r };
    for (const k of claves) if (c[k] != null) c[k] = Number(c[k]);
    return c;
  });
// Privacidad: con menos de MIN_GRUPO observaciones se muestra el total pero no el valor.
const oculta = (rows: Fila[], campo: string, nKey = "n") =>
  rows.map((r) => ((r[nKey] as number) >= MIN_GRUPO ? { ...r, suprimido: false } : { ...r, [campo]: null, suprimido: true }));

export async function analizar(seccion: SeccionAnalisis, filtros: Filtros, fuente = "todo") {
  const f = [filtros.ies, filtros.momento, filtros.modalidad];
  const fSinMomento = [filtros.ies, null, filtros.modalidad];
  const q = (texto: string, params: unknown[] = f) => sql.query(texto, params) as Promise<Fila[]>;

  switch (seccion) {
    case "criterios": {
      const [porCriterio, estados, variabilidad, porDimension] = await Promise.all([
        q(`SELECT s.criterio, o.momento, round(avg(s.nivel)::numeric, 2) promedio, count(*)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`, fSinMomento),
        q(`SELECT s.criterio, s.estado, count(*)::int n
           ${BASE} JOIN scores s ON s.observation_id = o.id ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT s.criterio, round(stddev_pop(s.nivel)::numeric, 2) sd, count(*)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1 ORDER BY 1`),
        q(`SELECT substr(s.criterio, 1, 1) dim, o.momento, round(avg(s.nivel)::numeric, 2) promedio, count(*)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`, fSinMomento),
      ]);
      return {
        porCriterio: oculta(nums(porCriterio, "promedio"), "promedio"),
        estados,
        variabilidad: oculta(nums(variabilidad, "sd"), "sd"),
        porDimension: oculta(nums(porDimension, "promedio"), "promedio"),
      };
    }

    case "ies": {
      const [promedio, obs, dimension, efectiva, ia, heatmap] = await Promise.all([
        q(`SELECT i.codigo ies, i.nombre, o.momento, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2, 3 ORDER BY 1, 3`, fSinMomento),
        q(`SELECT i.codigo ies, i.nombre, o.momento, count(*)::int n ${BASE} ${FILTRO} GROUP BY 1, 2, 3 ORDER BY 1, 3`),
        q(`SELECT i.codigo ies, i.nombre, substr(s.criterio, 1, 1) dim, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2, 3 ORDER BY 1, 3`),
        q(`SELECT i.codigo ies, i.nombre, count(*)::int n,
                  count(*) FILTER (WHERE o.clasificacion = 'Integración efectiva documentada')::int efectivas
           ${BASE} ${FILTRO} GROUP BY 1, 2 ORDER BY 1`),
        q(`SELECT i.codigo ies, i.nombre, count(*)::int n, count(*) FILTER (WHERE ${IA})::int con_ia
           ${BASE} ${FILTRO} GROUP BY 1, 2 ORDER BY 1`),
        q(`SELECT i.codigo ies, i.nombre, s.criterio, round(avg(s.nivel)::numeric, 2) promedio, count(*)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2, 3 ORDER BY 1, 3`),
      ]);
      return {
        promedio: oculta(nums(promedio, "promedio"), "promedio"),
        observaciones: obs,
        dimension: oculta(nums(dimension, "promedio"), "promedio"),
        efectiva: oculta(efectiva, "efectivas"),
        ia: oculta(ia, "con_ia"),
        heatmap: oculta(nums(heatmap, "promedio"), "promedio"),
      };
    }

    case "docentes": {
      const [cambios, mentores, porDocente, asignaturas, completitud] = await Promise.all([
        q(`WITH d AS (
             SELECT o.codigo_docente, o.momento, avg(s.nivel) a ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2)
           SELECT round((v2.a - v1.a)::numeric, 2) delta
           FROM d v1 JOIN d v2 ON v1.codigo_docente = v2.codigo_docente AND v1.momento = 'V1' AND v2.momento = 'V2'`, fSinMomento),
        q(`SELECT o.codigo_mentor, count(DISTINCT o.id)::int n, round(avg(s.nivel)::numeric, 2) promedio
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1 ORDER BY n DESC, 1 LIMIT 15`),
        q(`SELECT c.cnt::int visitas, count(*)::int docentes
           FROM (SELECT o.codigo_docente, count(*) cnt ${BASE} ${FILTRO} GROUP BY 1) c GROUP BY 1 ORDER BY 1`),
        q(`SELECT o.asignatura, count(DISTINCT o.id)::int n, round(avg(s.nivel)::numeric, 2) promedio
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1 HAVING count(DISTINCT o.id) >= ${MIN_GRUPO} ORDER BY n DESC, 1 LIMIT 10`),
        q(`WITH d AS (
             SELECT o.codigo_docente, bool_or(o.momento = 'V1') a, bool_or(o.momento = 'V2') b ${BASE} ${FILTRO} GROUP BY 1)
           SELECT CASE WHEN a AND b THEN 'V1 y V2' WHEN a THEN 'Solo V1' ELSE 'Solo V2' END grupo, count(*)::int n
           FROM d GROUP BY 1 ORDER BY 1`, fSinMomento),
      ]);
      const deltas = (nums(cambios, "delta") as { delta: number }[]).map((x) => x.delta);
      return {
        // Los códigos de mentor no se envían: se devuelven como M1, M2, ... por orden.
        cambios: deltas.length >= MIN_GRUPO ? deltas : [],
        mentores: oculta(
          nums(mentores, "promedio").map((m, i) => ({ mentor: `M${i + 1}`, n: m.n, promedio: m.promedio })),
          "promedio"
        ),
        porDocente,
        asignaturas: nums(asignaturas, "promedio"),
        completitud,
      };
    }

    case "contexto": {
      const [condiciones, o2, origen, limitaciones] = await Promise.all([
        q(`SELECT c.item, c.opcion, count(*)::int n ${BASE} JOIN condiciones c ON c.observation_id = o.id ${FILTRO}
           GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT c.item, c.opcion, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
           ${BASE} JOIN condiciones c ON c.observation_id = o.id
           JOIN scores s ON s.observation_id = o.id AND s.estado = 'valor' AND s.criterio IN ('2.1','2.2','2.3','2.4')
           ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT trim(x) origen, count(*)::int n
           ${BASE} JOIN condiciones c ON c.observation_id = o.id AND c.item = '4.2' AND c.origen IS NOT NULL,
           LATERAL unnest(string_to_array(c.origen, ',')) x ${FILTRO} GROUP BY 1 ORDER BY n DESC`),
        q(`SELECT o.modalidad, c.opcion, count(*)::int n
           ${BASE} JOIN condiciones c ON c.observation_id = o.id AND c.item = '4.3' ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`),
      ]);
      return { condiciones, o2: oculta(nums(o2, "promedio"), "promedio"), origen, limitaciones };
    }

    case "modalidad": {
      const [promedio, ia, o3, clasificacion, duracion] = await Promise.all([
        q(`SELECT o.modalidad, o.momento, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`, fSinMomento),
        q(`SELECT o.modalidad, count(*)::int n, count(*) FILTER (WHERE ${IA})::int con_ia
           ${BASE} ${FILTRO} GROUP BY 1 ORDER BY 1`),
        q(`SELECT o.modalidad, s.criterio, round(avg(s.nivel)::numeric, 2) promedio, count(*)::int n
           ${BASE} ${SCORES} ${FILTRO} AND s.criterio LIKE '3.%' GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT o.modalidad, o.clasificacion, count(*)::int n ${BASE} ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT o.modalidad, round(avg(o.duracion_min))::int promedio, count(*)::int n
           ${BASE} ${FILTRO} GROUP BY 1 ORDER BY 1`),
      ]);
      return {
        promedio: oculta(nums(promedio, "promedio"), "promedio"),
        ia: oculta(ia, "con_ia"),
        o3: oculta(nums(o3, "promedio"), "promedio"),
        clasificacion,
        duracion: oculta(duracion, "promedio"),
      };
    }

    case "tiempo": {
      const [semanas, diaHora, duracion, meses] = await Promise.all([
        q(`SELECT date_trunc('week', o.fecha)::date::text semana, o.momento, count(*)::int n
           ${BASE} ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT extract(isodow FROM o.fecha)::int dia, extract(hour FROM o.hora_inicio)::int hora, count(*)::int n
           ${BASE} ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`),
        q(`SELECT CASE WHEN o.duracion_min < 45 THEN '< 45' WHEN o.duracion_min < 60 THEN '45-59'
                       WHEN o.duracion_min < 75 THEN '60-74' WHEN o.duracion_min < 90 THEN '75-89' ELSE '90 o más' END rango,
                  min(o.duracion_min) orden, count(*)::int n
           ${BASE} ${FILTRO} GROUP BY 1 ORDER BY orden`),
        q(`SELECT to_char(o.fecha, 'YYYY-MM') mes, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
           ${BASE} ${SCORES} ${FILTRO} GROUP BY 1 ORDER BY 1`),
      ]);
      return { semanas, diaHora, duracion, meses: oculta(nums(meses, "promedio"), "promedio") };
    }

    case "texto": {
      const cuerpos: Record<string, string> = {
        evidencia: `SELECT o.evidencia_aula AS txt ${BASE} ${FILTRO} UNION ALL SELECT s.evidencia ${BASE} JOIN scores s ON s.observation_id = o.id ${FILTRO}`,
        sintesis: `SELECT v.value ${BASE}, LATERAL jsonb_each_text(o.sintesis) v ${FILTRO}`,
        condiciones: `SELECT c.descripcion ${BASE} JOIN condiciones c ON c.observation_id = o.id ${FILTRO}`,
        tarea: `SELECT o.tarea_resultado ${BASE} ${FILTRO} UNION ALL SELECT o.metodologia_recurso ${BASE} ${FILTRO}`,
        ...Object.fromEntries(
          [1, 2, 3, 4, 5, 6].map((n) => [
            `p${n}`,
            `SELECT ra.respuesta ${BASE} JOIN respuestas_abiertas ra ON ra.observation_id = o.id AND ra.pregunta = ${n} ${FILTRO}`,
          ])
        ),
      };
      cuerpos.respuestas = [1, 2, 3, 4, 5, 6].map((n) => cuerpos[`p${n}`]).join(" UNION ALL ");
      cuerpos.todo = ["respuestas", "evidencia", "sintesis", "condiciones", "tarea"].map((k) => cuerpos[k]).join(" UNION ALL ");
      const origen = cuerpos[fuente] ?? cuerpos.todo;
      const palabras = await q(
        `WITH t AS (SELECT * FROM (${origen}) AS x(txt)), w AS (SELECT lower(regexp_split_to_table(txt, '[^[:alpha:]]+')) AS palabra FROM t WHERE txt IS NOT NULL)
         SELECT palabra, count(*)::int n FROM w
         WHERE length(palabra) > 3 AND palabra <> ALL($4::text[])
         GROUP BY 1 HAVING count(*) >= ${MIN_GRUPO} ORDER BY n DESC, 1 LIMIT 70`,
        [...f, PALABRAS_VACIAS]
      );
      return { fuente: cuerpos[fuente] ? fuente : "todo", palabras };
    }
  }
}
