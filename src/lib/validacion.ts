import { z } from "zod";
import { CONDICIONES_ITEMS, CRITERIOS, MODALIDADES, MOMENTOS, OPCIONES_CONDICION, SIN_NA } from "./criterios";

const texto = (max = 2000) => z.string().trim().max(max);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida");

const score = z
  .object({
    criterio: z.enum(CRITERIOS),
    estado: z.enum(["valor", "NO", "NA"]),
    nivel: z.number().int().min(1).max(4).nullish(),
    evidencia: texto().optional(),
  })
  .superRefine((s, ctx) => {
    if (s.estado === "valor" && s.nivel == null)
      ctx.addIssue({ code: "custom", path: ["nivel"], message: "Elige un nivel" });
    if (s.estado === "NA" && SIN_NA.has(s.criterio))
      ctx.addIssue({ code: "custom", path: ["estado"], message: "Este criterio no admite NA" });
  });

export const observacionSchema = z
  .object({
    aval_etico: z.literal(true, { error: "Sin aval ético no se puede continuar" }),
    ies_codigo: texto(40).min(1, "Requerido"),
    codigo_docente: texto(40).min(1, "Requerido"),
    codigo_mentor: texto(40).min(1, "Requerido"),
    asignatura: texto(200).min(1, "Requerido"),
    codigo_catedra: texto(40).min(1, "Requerido"),
    momento: z.enum(MOMENTOS),
    fecha: z.iso.date(),
    hora_inicio: hora,
    hora_cierre: hora,
    // Minutos entre el inicio y el cierre que registra el sistema.
    duracion_min: z.number().int().min(1).max(4320).optional(),
    modalidad: z.enum(MODALIDADES),
    tarea_resultado: texto().min(1, "Requerido"),
    metodologia_recurso: texto(), // "si lo hubo": puede ir vacío
    scores: z.array(score).length(CRITERIOS.length, "Faltan criterios"),
    condiciones: z
      .array(
        z.object({
          item: z.enum(CONDICIONES_ITEMS),
          opcion: texto(200).min(1),
          origen: texto(200).optional(),
          descripcion: texto().optional(),
        })
      )
      .max(CONDICIONES_ITEMS.length),
    respuestas: z
      .array(z.object({ pregunta: z.number().int().min(1).max(6), respuesta: texto(4000) }))
      .max(6),
    evidencia_aula: texto(),
    comparacion_v1_v2: texto().optional(),
    diferencias: texto().optional(),
    sintesis: z.record(z.string(), z.string().max(4000)).optional(),
    // Firma dibujada al iniciar (PNG en base64). Obligatoria en el envío público; ver la ruta.
    firma: z.string().startsWith("data:image/png;base64,", "Firma no válida").max(250_000).optional(),
    // Campo trampa contra bots: debe llegar vacío.
    sitio_web: z.string().optional(),
  })
  .superRefine((o, ctx) => {
    const vistos = new Set(o.scores.map((s) => s.criterio));
    if (vistos.size !== CRITERIOS.length)
      ctx.addIssue({ code: "custom", path: ["scores"], message: "Criterios repetidos o faltantes" });
    for (const [i, c] of o.condiciones.entries())
      if (!OPCIONES_CONDICION[c.item].includes(c.opcion))
        ctx.addIssue({ code: "custom", path: ["condiciones", i, "opcion"], message: "Opción no válida" });
  });

export type ObservacionInput = z.infer<typeof observacionSchema>;
