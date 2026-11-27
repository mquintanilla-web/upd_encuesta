import { NextRequest } from "next/server";
import { analizar, SECCIONES_ANALISIS, type SeccionAnalisis } from "@/lib/analisis";
import { leerFiltros } from "@/lib/resultados";

export async function GET(req: NextRequest) {
  // Se leen fuera del try para no capturar el aviso interno de Next sobre rutas dinámicas.
  const p = req.nextUrl.searchParams;
  const seccion = p.get("seccion") as SeccionAnalisis;
  const fuente = p.get("fuente") ?? "todo";
  const filtros = leerFiltros(p);
  if (!SECCIONES_ANALISIS.includes(seccion)) return Response.json({ error: "Sección no válida" }, { status: 400 });
  try {
    return Response.json(await analizar(seccion, filtros, fuente));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo calcular el análisis" }, { status: 500 });
  }
}
