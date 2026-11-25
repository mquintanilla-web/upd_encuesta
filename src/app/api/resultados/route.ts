import { NextRequest } from "next/server";
import { calcularResultados, leerFiltros } from "@/lib/resultados";

export async function GET(req: NextRequest) {
  // Se leen fuera del try para no capturar el aviso interno de Next sobre rutas dinámicas.
  const filtros = leerFiltros(req.nextUrl.searchParams);
  try {
    return Response.json(await calcularResultados(filtros));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudieron calcular los resultados" }, { status: 500 });
  }
}
