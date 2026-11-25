import "./env";
import { fakerES as faker } from "@faker-js/faker";
import { sql } from "../src/lib/db";
import { guardarObservacion } from "../src/lib/guardar";
import { CRITERIOS, OPCIONES_CONDICION, CONDICIONES_ITEMS } from "../src/lib/criterios";
import type { ObservacionInput } from "../src/lib/validacion";

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const nArg = args.find((a) => a.startsWith("--n="));
const TOTAL = Math.min(300, Math.max(200, nArg ? Number(nArg.slice(4)) : 250));

faker.seed(2026);

const IES = [
  { codigo: "UPD", nombre: "Universidad Pedagógica de El Salvador", sesgo: 0.15 },
  { codigo: "IES-02", nombre: "Instituto Superior Cuscatlán", sesgo: -0.15 },
  { codigo: "IES-03", nombre: "Universidad del Pacífico Salvadoreño", sesgo: 0.05 },
  { codigo: "IES-04", nombre: "Escuela Normal Superior Lempa", sesgo: -0.25 },
  { codigo: "IES-05", nombre: "Universidad Andina Centroamericana", sesgo: 0.25 },
];

const ASIGNATURAS = [
  "Didáctica general", "Matemática para la educación", "Lenguaje y literatura", "Ciencias naturales",
  "Evaluación de los aprendizajes", "Tecnología educativa", "Estudios sociales", "Pedagogía inclusiva",
  "Psicología del aprendizaje", "Investigación educativa",
];
const METODOLOGIAS = [
  "Aprendizaje basado en proyectos", "Aula invertida", "Aprendizaje basado en problemas",
  "Aprendizaje cooperativo", "Gamificación", "Estudio de casos",
];
const RECURSOS = ["Moodle", "Google Classroom", "Kahoot", "Padlet", "Canva", "Genially", "Teams"];

const gauss = () => {
  const u = faker.number.float({ min: 1e-9, max: 1 });
  const v = faker.number.float({ min: 0, max: 1 });
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const pad = (n: number, l = 3) => String(n).padStart(l, "0");
const hhmm = (min: number) => `${pad(Math.floor(min / 60), 2)}:${pad(min % 60, 2)}`;
const clamp = (x: number) => Math.min(4, Math.max(1, Math.round(x)));

function pesoModalidad() {
  const r = faker.number.float({ min: 0, max: 1 });
  return r < 0.55 ? "Presencial" : r < 0.85 ? "Mixta" : "Virtual";
}

async function main() {
  if (RESET) {
    await sql`TRUNCATE respuestas_abiertas, condiciones, scores, observations, ies RESTART IDENTITY CASCADE`;
    console.log("Tablas vaciadas");
  }
  for (const i of IES)
    await sql`INSERT INTO ies (codigo, nombre) VALUES (${i.codigo}, ${i.nombre}) ON CONFLICT (codigo) DO NOTHING`;

  // 15 mentores (3 por IES) y 60 docentes (12 por IES).
  const mentores = IES.flatMap((ies, k) =>
    Array.from({ length: 3 }, (_, j) => ({ codigo: `MEN-${pad(k * 3 + j + 1, 2)}`, ies }))
  );
  const docentes = IES.flatMap((ies, k) =>
    Array.from({ length: 12 }, (_, j) => ({
      codigo: `DOC-${pad(k * 12 + j + 1)}`,
      ies,
      mentor: mentores[k * 3 + (j % 3)].codigo,
      efecto: gauss() * 0.35,
      // 2 cátedras por docente; 10 docentes con 3 para alcanzar hasta 300 observaciones.
      catedras: (j % 6 === 0 ? [1, 2, 3] : [1, 2]).map((c) => ({
        codigo: `CAT-${pad(k * 12 + j + 1)}-${c}`,
        asignatura: faker.helpers.arrayElement(ASIGNATURAS),
        modalidad: pesoModalidad(),
      })),
    }))
  );

  // Cada cátedra tiene V1 y V2; se descartan algunas V2 hasta llegar al total.
  type Visita = { d: (typeof docentes)[number]; cat: (typeof docentes)[number]["catedras"][number]; m: "V1" | "V2" };
  const casos = docentes.flatMap((d) => d.catedras.map((cat) => ({ d, cat })));
  faker.helpers.shuffle(casos);
  const visitas: Visita[] = [];
  for (const c of casos) {
    visitas.push({ ...c, m: "V1" });
    visitas.push({ ...c, m: "V2" });
  }
  const sobrantes = visitas.length - TOTAL;
  const v2 = faker.helpers.shuffle(visitas.filter((v) => v.m === "V2"));
  const descartar = new Set(v2.slice(0, Math.max(0, sobrantes)));
  const lista = visitas.filter((v) => !descartar.has(v)).slice(0, TOTAL);

  let ok = 0;
  const conteo: Record<string, number> = {};
  for (const v of lista) {
    const { d, cat, m } = v;
    const conectividad = faker.helpers.weightedArrayElement([
      { weight: cat.modalidad === "Virtual" ? 40 : 18, value: "Con limitaciones" },
      { weight: cat.modalidad === "Virtual" ? 5 : 2, value: "Sin conectividad" },
      { weight: 100, value: "Adecuada" },
    ]);
    const clima = faker.helpers.weightedArrayElement([
      { weight: 20, value: "Limita la participación" },
      { weight: 25, value: "Neutro" },
      { weight: 55, value: "Favorece la participación" },
    ]);
    const limConn = conectividad !== "Adecuada";
    const limClima = clima === "Limita la participación";

    const usaIA = faker.number.float({ min: 0, max: 1 }) <
      (cat.modalidad === "Virtual" ? 0.9 : cat.modalidad === "Mixta" ? 0.6 : 0.4);

    const scores: ObservacionInput["scores"] = CRITERIOS.map((criterio) => {
      const O3 = criterio.startsWith("3.");
      if (O3 && (!usaIA || (criterio === "3.2" && faker.datatype.boolean(0.3))))
        return { criterio, estado: "NA" as const };
      if (criterio === "2.5" && faker.datatype.boolean(0.2)) return { criterio, estado: "NA" as const };
      if (faker.datatype.boolean(0.03)) return { criterio, estado: "NO" as const };
      let x = 2.5 + d.ies.sesgo + d.efecto + (m === "V2" ? 0.5 : 0) + gauss() * 0.55;
      if (limConn && (criterio === "2.2" || criterio === "2.4")) x -= 0.7;
      if (limClima && (criterio === "1.1" || criterio === "2.3")) x -= 0.7;
      return {
        criterio,
        estado: "valor" as const,
        nivel: clamp(x),
        evidencia: faker.lorem.sentence(),
      };
    });

    const inicio = faker.number.int({ min: 7 * 60, max: 17 * 60 });
    const fin = inicio + faker.number.int({ min: 40, max: 95 });
    const fecha =
      m === "V1"
        ? faker.date.between({ from: "2026-08-03", to: "2026-09-30" })
        : faker.date.between({ from: "2026-10-05", to: "2026-11-25" });

    const input: ObservacionInput = {
      aval_etico: true,
      ies_codigo: d.ies.codigo,
      codigo_docente: d.codigo,
      codigo_mentor: d.mentor,
      asignatura: cat.asignatura,
      codigo_catedra: cat.codigo,
      momento: m,
      fecha: fecha.toISOString().slice(0, 10),
      hora_inicio: hhmm(inicio),
      hora_cierre: hhmm(fin),
      modalidad: cat.modalidad as ObservacionInput["modalidad"],
      tarea_resultado: faker.lorem.sentence(),
      metodologia_recurso: `${faker.helpers.arrayElement(METODOLOGIAS)} · ${faker.helpers.arrayElement(RECURSOS)}`,
      scores,
      condiciones: CONDICIONES_ITEMS.map((item) => ({
        item,
        opcion:
          item === "4.1" ? clima : item === "4.3" ? conectividad : faker.helpers.arrayElement(OPCIONES_CONDICION[item]),
        origen: faker.helpers.arrayElement(["Observado", "Reportado por el docente"]),
        descripcion: faker.lorem.sentence(),
      })),
      respuestas: [1, 2, 3, 4, 5, 6].map((pregunta) => ({ pregunta, respuesta: faker.lorem.sentences(2) })),
      // 8% sin respaldo documental para que aparezca "Evidencia insuficiente".
      evidencia_aula: faker.datatype.boolean(0.92) ? faker.lorem.sentence() : "",
      comparacion_v1_v2: m === "V2" ? faker.lorem.sentence() : undefined,
      diferencias: faker.lorem.sentence(),
      sintesis: {
        practica: faker.lorem.sentence(),
        fortalezas: faker.lorem.sentence(),
        acompanamiento: faker.lorem.sentence(),
        acuerdos: faker.lorem.sentence(),
      },
    };

    const r = await guardarObservacion(input);
    if (r) {
      ok++;
      conteo[r.clasificacion] = (conteo[r.clasificacion] ?? 0) + 1;
    }
  }
  console.log(`Observaciones sembradas: ${ok}`);
  console.log("Clasificación:", conteo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
