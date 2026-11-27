import { NextRequest } from "next/server";
import { cargarDatos, crearPdf } from "@/lib/pdf";
import { leerFiltros } from "@/lib/resultados";

// ?id=N  -> una observación.  Sin id -> todas las que cumplan los filtros (ies, momento, modalidad).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const idTxt = p.get("id");
  const id = idTxt ? Number(idTxt) : null;
  if (idTxt && (!Number.isInteger(id) || (id as number) < 1))
    return Response.json({ error: "id no válido" }, { status: 400 });
  const filtros = leerFiltros(p);

  try {
    const datos = await cargarDatos(id ? { id } : { filtros });
    if (id && !datos.obs.length) return Response.json({ error: "No existe" }, { status: 404 });
    const nombre = id ? `observacion-i03-${id}.pdf` : "encuestas-i03-upd.pdf";
    return new Response(crearPdf(datos, id ? `Observación I03 #${id}` : "Observaciones I03"), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
