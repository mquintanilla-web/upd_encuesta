export type Clasificacion =
  | "Integración efectiva documentada"
  | "Integración en desarrollo"
  | "Evidencia insuficiente";

export interface ScoreLite {
  criterio: string;
  estado: "valor" | "NO" | "NA";
  nivel?: number | null;
}

/**
 * Clasificación según 2.1 a 2.4.
 * - Evidencia insuficiente: algún criterio con NO (o sin valor) o sin respaldo documental.
 * - En desarrollo: los cuatro valorados y al menos uno por debajo de 2.
 * - Efectiva documentada: los cuatro con nivel 2 o más y con respaldo.
 */
export function clasificar(scores: ScoreLite[], conRespaldo: boolean): Clasificacion {
  const o2 = ["2.1", "2.2", "2.3", "2.4"].map((c) => scores.find((s) => s.criterio === c));
  const completos = o2.every((s) => s && s.estado === "valor" && typeof s.nivel === "number");
  if (!completos) return "Evidencia insuficiente";
  const niveles = o2.map((s) => s!.nivel as number);
  if (niveles.some((n) => n < 2)) return "Integración en desarrollo";
  return conRespaldo ? "Integración efectiva documentada" : "Evidencia insuficiente";
}
