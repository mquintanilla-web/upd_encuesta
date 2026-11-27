import { createHmac, timingSafeEqual } from "node:crypto";

// EXPORT_CODE: código que desbloquea el PDF de todas las encuestas. También es la llave
// con la que se firma el enlace del PDF individual que recibe quien envía el formulario.
const codigo = () => process.env.EXPORT_CODE ?? "";

const igual = (a: string, b: string) => {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};

export function tokenPdf(id: number) {
  return createHmac("sha256", codigo()).update(`pdf:${id}`).digest("hex").slice(0, 32);
}

export const claveValida = (c: string | null) => !!codigo() && !!c && igual(c.trim(), codigo());
export const tokenValido = (id: number, t: string | null) => !!codigo() && !!t && igual(t, tokenPdf(id));

// Intentos fallidos por IP (en memoria, mejor esfuerzo): 8 cada 10 minutos.
const fallos = new Map<string, number[]>();
const VENTANA = 10 * 60 * 1000;
export const bloqueada = (ip: string) => (fallos.get(ip) ?? []).filter((t) => Date.now() - t < VENTANA).length >= 8;
export const registrarFallo = (ip: string) => {
  const r = (fallos.get(ip) ?? []).filter((t) => Date.now() - t < VENTANA);
  r.push(Date.now());
  fallos.set(ip, r);
};
