import { sql } from "./db";
import { MIN_GRUPO, MODALIDADES, MOMENTOS } from "./criterios";

const BASE = `FROM observations o JOIN ies i ON i.id = o.ies_id`;
const FILTRO = `WHERE ($1::text IS NULL OR i.codigo = $1)
  AND ($2::text IS NULL OR o.momento = $2)
  AND ($3::text IS NULL OR o.modalidad = $3)`;
const O2 = `s.criterio IN ('2.1','2.2','2.3','2.4')`;

export type Filtros = { ies: string | null; momento: string | null; modalidad: string | null };

export function leerFiltros(p: URLSearchParams): Filtros {
  const momento = p.get("momento") ?? "";
  const modalidad = p.get("modalidad") ?? "";
  return {
    ies: p.get("ies") || null,
    momento: (MOMENTOS as readonly string[]).includes(momento) ? momento : null,
    modalidad: (MODALIDADES as readonly string[]).includes(modalidad) ? modalidad : null,
  };
}

// Privacidad: un grupo con menos de MIN_GRUPO observaciones muestra el total pero no el valor.
type Fila = { n: number; suprimido: boolean; [k: string]: string | number | boolean | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const oculto = (r: Record<string, any>, campos: string[]): Fila => {
  if (r.n >= MIN_GRUPO) return { ...r, suprimido: false } as Fila;
  const copia = { ...r, suprimido: true } as Fila;
  for (const c of campos) copia[c] = null;
  return copia;
};
const num = (x: unknown) => (x == null ? null : Number(x));
const conPromedio = (rows: Record<string, unknown>[]) =>
  rows.map((r) => oculto({ ...r, promedio: num(r.promedio) }, ["promedio"]));

export async function calcularResultados(filtros: Filtros) {
  const f = [filtros.ies, filtros.momento, filtros.modalidad];
  const fSinMomento = [filtros.ies, null, filtros.modalidad];

  const [resumen, porCriterio, distribucion, clasifIes, evolucion, conectividad, clima, modalidadProm, iaModalidad, heatmap, condiciones] =
    await Promise.all([
      sql.query(
        `SELECT count(*)::int total,
                count(*) FILTER (WHERE o.momento='V1')::int v1,
                count(*) FILTER (WHERE o.momento='V2')::int v2,
                count(DISTINCT o.ies_id)::int ies,
                round(avg(o.duracion_min))::int duracion_prom
         ${BASE} ${FILTRO}`, f),
      sql.query(
        `SELECT s.criterio, o.momento, round(avg(s.nivel)::numeric, 2) promedio, count(*)::int n
         ${BASE} JOIN scores s ON s.observation_id = o.id
         ${FILTRO} AND s.estado = 'valor'
         GROUP BY 1, 2 ORDER BY 1, 2`, fSinMomento),
      sql.query(
        `SELECT s.criterio, s.nivel, count(*)::int n
         ${BASE} JOIN scores s ON s.observation_id = o.id
         ${FILTRO} AND s.estado = 'valor'
         GROUP BY 1, 2 ORDER BY 1, 2`, f),
      sql.query(
        `SELECT i.codigo ies, i.nombre, o.clasificacion, count(*)::int n
         ${BASE} ${FILTRO} GROUP BY 1, 2, 3 ORDER BY 1, 3`, f),
      sql.query(
        `WITH d AS (
           SELECT o.codigo_docente, o.momento, avg(s.nivel) a
           ${BASE} JOIN scores s ON s.observation_id = o.id
           ${FILTRO} AND s.estado = 'valor'
           GROUP BY 1, 2)
         SELECT CASE WHEN v2.a - v1.a > 0.1 THEN 'mejoraron'
                     WHEN v2.a - v1.a < -0.1 THEN 'bajaron'
                     ELSE 'mantuvieron' END grupo,
                count(*)::int n
         FROM d v1 JOIN d v2 ON v1.codigo_docente = v2.codigo_docente AND v1.momento='V1' AND v2.momento='V2'
         GROUP BY 1`, fSinMomento),
      sql.query(
        `SELECT c.opcion, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
         ${BASE} JOIN condiciones c ON c.observation_id = o.id AND c.item = '4.3'
         JOIN scores s ON s.observation_id = o.id AND ${O2} AND s.estado = 'valor'
         ${FILTRO} GROUP BY 1 ORDER BY 1`, f),
      sql.query(
        `SELECT c.opcion, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
         ${BASE} JOIN condiciones c ON c.observation_id = o.id AND c.item = '4.1'
         JOIN scores s ON s.observation_id = o.id AND ${O2} AND s.estado = 'valor'
         ${FILTRO} GROUP BY 1 ORDER BY 1`, f),
      sql.query(
        `SELECT o.modalidad, round(avg(s.nivel)::numeric, 2) promedio, count(DISTINCT o.id)::int n
         ${BASE} JOIN scores s ON s.observation_id = o.id AND s.estado = 'valor'
         ${FILTRO} GROUP BY 1 ORDER BY 1`, f),
      sql.query(
        `SELECT o.modalidad, count(*)::int n,
                count(*) FILTER (WHERE EXISTS (
                  SELECT 1 FROM scores s WHERE s.observation_id = o.id AND s.criterio LIKE '3.%' AND s.estado <> 'NA'
                ))::int con_ia
         ${BASE} ${FILTRO} GROUP BY 1 ORDER BY 1`, f),
      sql.query(
        `SELECT i.codigo ies, i.nombre, s.criterio, round(avg(s.nivel)::numeric, 2) promedio, count(*)::int n
         ${BASE} JOIN scores s ON s.observation_id = o.id AND s.estado = 'valor'
         ${FILTRO} GROUP BY 1, 2, 3 ORDER BY 1, 3`, f),
      sql.query(
        `SELECT c.item, c.opcion, count(*)::int n
         ${BASE} JOIN condiciones c ON c.observation_id = o.id
         ${FILTRO} GROUP BY 1, 2 ORDER BY 1, 2`, f),
    ]);

  // Clasificación por IES: se oculta el desglose si la IES tiene menos de MIN_GRUPO observaciones.
  const totalIes = new Map<string, number>();
  for (const r of clasifIes) totalIes.set(r.ies, (totalIes.get(r.ies) ?? 0) + r.n);
  const clasificacionIes = clasifIes.map((r) =>
    (totalIes.get(r.ies) ?? 0) >= MIN_GRUPO
      ? { ies: r.ies as string, nombre: r.nombre as string, clasificacion: r.clasificacion as string | null, n: r.n as number, suprimido: false }
      : { ies: r.ies as string, nombre: r.nombre as string, clasificacion: null, n: totalIes.get(r.ies) as number, suprimido: true }
  );
  const vistos = new Map<string, (typeof clasificacionIes)[number]>();
  for (const r of clasificacionIes) vistos.set(`${r.ies}|${r.clasificacion}`, r);
  const totalEvol = evolucion.reduce((a, r) => a + r.n, 0);

  return {
    filtros,
    resumen: resumen[0] as { total: number; v1: number; v2: number; ies: number; duracion_prom: number | null },
    porCriterio: conPromedio(porCriterio),
    distribucion: distribucion as { criterio: string; nivel: number; n: number }[],
    clasificacionIes: [...vistos.values()],
    evolucionDocente: (totalEvol >= MIN_GRUPO ? evolucion : []) as { grupo: string; n: number }[],
    correlaciones: { conectividad: conPromedio(conectividad), clima: conPromedio(clima) },
    modalidad: conPromedio(modalidadProm),
    usoIa: iaModalidad.map((r) => oculto(r, ["con_ia"])),
    heatmap: conPromedio(heatmap),
    condiciones: condiciones as { item: string; opcion: string; n: number }[],
  };
}

export type Resultados = Awaited<ReturnType<typeof calcularResultados>>;
