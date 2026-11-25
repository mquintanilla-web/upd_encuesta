import { NextRequest } from "next/server";
import { guardarObservacion } from "@/lib/guardar";
import { observacionSchema } from "@/lib/validacion";

// Límite por IP en memoria (mejor esfuerzo en serverless): 10 envíos / 10 min.
const VENTANA_MS = 10 * 60 * 1000;
const MAX_ENVIOS = 10;
const envios = new Map<string, number[]>();

function limitado(ip: string) {
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= MAX_ENVIOS) {
    envios.set(ip, recientes);
    return true;
  }
  recientes.push(ahora);
  envios.set(ip, recientes);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (limitado(ip)) return Response.json({ ok: false, error: "Demasiados envíos" }, { status: 429 });

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ ok: false, error: "JSON no válido" }, { status: 400 });
  }

  const parsed = observacionSchema.safeParse(cuerpo);
  if (!parsed.success) {
    const campos: Record<string, string> = {};
    for (const i of parsed.error.issues) campos[i.path.join(".") || "_"] ??= i.message;
    return Response.json({ ok: false, campos }, { status: 422 });
  }

  // Bot: el campo trampa vino lleno. Se responde como éxito sin guardar.
  if (parsed.data.sitio_web) return Response.json({ ok: true });

  try {
    const r = await guardarObservacion(parsed.data);
    if (!r) return Response.json({ ok: false, campos: { ies_codigo: "IES desconocida" } }, { status: 422 });
    return Response.json({ ok: true, id: r.id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
  }
}
