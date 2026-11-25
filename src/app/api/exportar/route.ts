import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { sql } from "@/lib/db";
import { calcularResultados, leerFiltros } from "@/lib/resultados";
import { CRITERIOS } from "@/lib/criterios";

// Solo escritura de libros (no se lee ningún archivo subido).
export async function GET(req: NextRequest) {
  const filtros = leerFiltros(req.nextUrl.searchParams);
  try {
    const r = await calcularResultados(filtros);

    // Detalle sin identificadores: sin códigos de docente, mentor, cátedra ni caso.
    const columnas = CRITERIOS.map(
      (c) => `max(CASE WHEN s.criterio='${c}' THEN COALESCE(s.nivel::text, s.estado) END) AS "${c}"`
    ).join(", ");
    const detalle = await sql.query(
      `SELECT i.codigo AS ies, o.momento, o.modalidad, o.fecha::text AS fecha,
              o.duracion_min, o.clasificacion, ${columnas}
       FROM observations o JOIN ies i ON i.id = o.ies_id
       JOIN scores s ON s.observation_id = o.id
       WHERE ($1::text IS NULL OR i.codigo = $1)
         AND ($2::text IS NULL OR o.momento = $2)
         AND ($3::text IS NULL OR o.modalidad = $3)
       GROUP BY o.id, i.codigo ORDER BY o.fecha, o.id`,
      [filtros.ies, filtros.momento, filtros.modalidad]
    );

    const quitar = (rows: Record<string, unknown>[]) =>
      rows.map(({ suprimido, ...resto }) => (suprimido ? { ...resto, nota: "n < 3" } : resto));

    const libro = XLSX.utils.book_new();
    const hoja = (nombre: string, rows: Record<string, unknown>[]) =>
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(rows.length ? rows : [{ sin_datos: "" }]), nombre);

    hoja("Resumen", [r.resumen]);
    hoja("Promedio por criterio", quitar(r.porCriterio));
    hoja("Distribución", r.distribucion);
    hoja("Clasificación por IES", quitar(r.clasificacionIes));
    hoja("Evolución docentes", r.evolucionDocente);
    hoja("Conectividad", quitar(r.correlaciones.conectividad));
    hoja("Clima", quitar(r.correlaciones.clima));
    hoja("Modalidad", quitar(r.modalidad));
    hoja("Uso de IA", quitar(r.usoIa));
    hoja("Mapa de calor", quitar(r.heatmap));
    hoja("Condiciones O4", r.condiciones);
    hoja("Detalle", detalle);

    const buf = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="resultados-i03-upd.xlsx"',
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo exportar" }, { status: 500 });
  }
}
