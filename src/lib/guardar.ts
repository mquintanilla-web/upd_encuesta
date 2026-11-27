import { sql } from "./db";
import { clasificar } from "./clasificacion";
import type { ObservacionInput } from "./validacion";

function minutos(ini: string, fin: string) {
  const [h1, m1] = ini.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

/**
 * Guarda la observación y todas sus tablas hijas en UNA sola sentencia
 * (CTE encadenadas), por lo que es atómica. La clasificación se calcula aquí.
 */
export async function guardarObservacion(o: ObservacionInput) {
  const clasificacion = clasificar(o.scores, o.evidencia_aula.trim().length > 0);
  const duracion = o.duracion_min ?? minutos(o.hora_inicio, o.hora_cierre);
  const scores = o.scores.map((s) => ({
    criterio: s.criterio,
    nivel: s.estado === "valor" ? s.nivel : null,
    estado: s.estado,
    evidencia: s.evidencia || null,
  }));

  const rows = await sql.query(
    `WITH o AS (
       INSERT INTO observations
         (aval_etico, ies_id, codigo_docente, codigo_mentor, asignatura, codigo_catedra, momento,
          fecha, hora_inicio, hora_cierre, duracion_min, codigo_caso, modalidad, tarea_resultado,
          metodologia_recurso, evidencia_aula, comparacion_v1_v2, diferencias, sintesis, clasificacion, firma)
       SELECT true, i.id, $2, $3, $4, $5, $6, $7::date, $8::time, $9::time, $10, $11, $12, $13,
              $14, $15, $16, $17, $18::jsonb, $19, $23
       FROM ies i WHERE i.codigo = $1
       RETURNING id
     ), s AS (
       INSERT INTO scores (observation_id, criterio, nivel, estado, evidencia)
       SELECT o.id, x.criterio, x.nivel, x.estado, x.evidencia
       FROM o, jsonb_to_recordset($20::jsonb) AS x(criterio text, nivel smallint, estado text, evidencia text)
     ), c AS (
       INSERT INTO condiciones (observation_id, item, opcion, origen, descripcion)
       SELECT o.id, x.item, x.opcion, x.origen, x.descripcion
       FROM o, jsonb_to_recordset($21::jsonb) AS x(item text, opcion text, origen text, descripcion text)
     ), r AS (
       INSERT INTO respuestas_abiertas (observation_id, pregunta, respuesta)
       SELECT o.id, x.pregunta, x.respuesta
       FROM o, jsonb_to_recordset($22::jsonb) AS x(pregunta smallint, respuesta text)
     )
     SELECT id FROM o`,
    [
      o.ies_codigo,
      o.codigo_docente,
      o.codigo_mentor,
      o.asignatura,
      o.codigo_catedra,
      o.momento,
      o.fecha,
      o.hora_inicio,
      o.hora_cierre,
      duracion,
      `${o.ies_codigo}-${o.codigo_docente}-${o.momento}-${o.codigo_catedra}`,
      o.modalidad,
      o.tarea_resultado,
      o.metodologia_recurso,
      o.evidencia_aula || null,
      o.comparacion_v1_v2 || null,
      o.diferencias || null,
      o.sintesis ? JSON.stringify(o.sintesis) : null,
      clasificacion,
      JSON.stringify(scores),
      JSON.stringify(o.condiciones),
      JSON.stringify(o.respuestas),
      o.firma ?? null,
    ]
  );
  if (!rows.length) return null; // IES inexistente
  return { id: rows[0].id as number, clasificacion };
}
