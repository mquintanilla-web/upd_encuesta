import { NextRequest } from "next/server";
import { bloqueada, claveValida, registrarFallo, tokenValido } from "@/lib/acceso";
import { cargarDatos, crearPdf } from "@/lib/pdf";
import { leerFiltros } from "@/lib/resultados";

// ?id=N&t=TOKEN -> una observación, con el enlace firmado que recibe quien la envía.
// Con el encabezado x-clave (código de acceso) -> una observación (?id=N) o todas (filtros ies, momento, modalidad).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const idTxt = p.get("id");
  const id = idTxt ? Number(idTxt) : null;
  if (idTxt && (!Number.isInteger(id) || (id as number) < 1))
    return Response.json({ error: "id no válido" }, { status: 400 });
  const filtros = leerFiltros(p);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (bloqueada(ip)) return Response.json({ error: "Demasiados intentos" }, { status: 429 });

  const conEnlace = id !== null && tokenValido(id, p.get("t"));
  if (!conEnlace && !claveValida(req.headers.get("x-clave"))) {
    registrarFallo(ip);
    return Response.json({ error: "Código incorrecto" }, { status: 401 });
  }

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
