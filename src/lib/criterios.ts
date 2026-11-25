export const CRITERIOS_O1 = ["1.1", "1.2", "1.3", "1.4"] as const;
export const CRITERIOS_O2 = ["2.1", "2.2", "2.3", "2.4", "2.5"] as const;
export const CRITERIOS_O3 = ["3.1", "3.2", "3.3", "3.4"] as const;
export const CRITERIOS = [...CRITERIOS_O1, ...CRITERIOS_O2, ...CRITERIOS_O3] as const;

// Criterios que no admiten NA (el resto sí).
export const SIN_NA = new Set<string>(["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4"]);

export const CONDICIONES_ITEMS = ["4.1", "4.2", "4.3", "4.4", "4.5"] as const;

// Opciones provisionales de O4: se reemplazan con los textos del PDF del I03.
export const OPCIONES_CONDICION: Record<string, string[]> = {
  "4.1": ["Favorece la participación", "Neutro", "Limita la participación"],
  "4.2": ["Adecuado", "Con limitaciones"],
  "4.3": ["Adecuada", "Con limitaciones", "Sin conectividad"],
  "4.4": ["Adecuado", "Con limitaciones"],
  "4.5": ["Adecuada", "Con limitaciones"],
};

export const MODALIDADES = ["Presencial", "Mixta", "Virtual"] as const;
export const MOMENTOS = ["V1", "V2"] as const;
export const MIN_GRUPO = 3;
