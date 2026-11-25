// Textos del instrumento I03 v1.4 (PMD-01_I03_Guia_integrada_observacion_v1_4).
export type Criterio = {
  id: string;
  nombre: string;
  /** Descriptores de los niveles 1 a 4. */
  niveles: [string, string, string, string];
  /** Admite NA (no aplica). */
  na?: boolean;
};

export type Dimension = { id: "O1" | "O2" | "O3"; titulo: string; criterios: Criterio[] };

export const NIVELES = ["Inicial", "En desarrollo", "Competente", "Destacado"] as const;

export const O1: Dimension = {
  id: "O1",
  titulo: "Metodologías activas e innovación pedagógica",
  criterios: [
    {
      id: "1.1",
      nombre: "Participación activa del estudiante",
      niveles: [
        "Predomina la exposición y hay escasa participación estudiantil.",
        "Hay preguntas o intervenciones breves dirigidas por el docente.",
        "El estudiantado analiza casos, colabora o resuelve problemas.",
        "El estudiantado dirige parte de la tarea, argumenta, decide y construye respuestas con sus pares.",
      ],
    },
    {
      id: "1.2",
      nombre: "Aplicación de metodologías activas",
      niveles: [
        "Predominan tareas de reproducción o memorización.",
        "Se incorpora una actividad activa aislada, poco vinculada con el resultado esperado.",
        "Se aplica una metodología activa con consignas y roles claros, alineada con el resultado. (P) La planificación la contempla.",
        "La metodología guía la tarea y el estudiantado investiga, crea o resuelve problemas. (P) Se comprueba su continuidad.",
      ],
    },
    {
      id: "1.3",
      nombre: "Aprendizajes en contexto",
      niveles: [
        "Los contenidos se presentan de forma aislada y descontextualizada.",
        "Se ofrecen ejemplos del contexto disciplinar, profesional o local, con poca participación del estudiantado en su análisis.",
        "El estudiantado aplica los contenidos a una situación pertinente de su contexto.",
        "Los estudiantes analizan problemas reales de su entorno y proponen soluciones aplicables.",
      ],
    },
    {
      id: "1.4",
      nombre: "Monitoreo y ajuste de la actividad",
      niveles: [
        "No se verifica la participación ni la comprensión de los estudiantes durante la actividad.",
        "Se formulan preguntas generales de verificación y queda poco claro cómo se usan las respuestas.",
        "Se recogen evidencias de participación y aprendizaje para ajustar o ratificar consignas, tiempos o apoyos.",
        "Se justifica y comunica la decisión con evidencias de distintos grupos. (P) Se registra para sesiones siguientes.",
      ],
    },
  ],
};

export const O2: Dimension = {
  id: "O2",
  titulo: "Integración de metodología activa y tecnología digital",
  criterios: [
    {
      id: "2.1",
      nombre: "Coherencia con el resultado de aprendizaje",
      niveles: [
        "La actividad carece de un propósito de aprendizaje identificable.",
        "El resultado es identificable, pero su relación con la tarea, el recurso digital o el producto es parcial.",
        "La tarea, el recurso digital y el producto esperado se alinean con el resultado de aprendizaje.",
        "Se justifica esa alineación y se ajusta la experiencia a partir de evidencias de su implementación.",
      ],
    },
    {
      id: "2.2",
      nombre: "Función pedagógica de la tecnología",
      niveles: [
        "Se verifica que en la experiencia observada no se utiliza tecnología digital.",
        "Se usa tecnología para presentar o distribuir información, sin una función en la tarea activa.",
        "La tecnología apoya una acción de aprendizaje, como analizar, construir, colaborar o revisar.",
        "La elección se justifica según el contexto y se ajusta considerando su utilidad y el acceso del estudiantado.",
      ],
    },
    {
      id: "2.3",
      nombre: "Participación activa del estudiante",
      niveles: [
        "El estudiantado se limita a recibir información.",
        "El estudiantado responde o realiza tareas breves con escasa elaboración o toma de decisiones.",
        "El estudiantado resuelve, analiza, produce o colabora y explica sus decisiones.",
        "El estudiantado revisa, argumenta y mejora su trabajo a partir de la reflexión o del intercambio.",
      ],
    },
    {
      id: "2.4",
      nombre: "Articulación en la secuencia didáctica",
      niveles: [
        "La evidencia muestra que no hay relación entre tecnología y metodología activa.",
        "Ambas están presentes, pero funcionan como actividades separadas.",
        "La tecnología cumple una función en un paso central de la metodología activa y hay evidencia de su uso.",
        "Se revisa la articulación con evidencias y se documentan ajustes a la secuencia.",
      ],
    },
    {
      id: "2.5",
      nombre: "Evaluación formativa y uso de evidencias",
      na: true,
      niveles: [
        "Los recursos de evaluación utilizados no permiten recoger evidencias vinculadas con el resultado de aprendizaje.",
        "Los recursos recogen evidencias del aprendizaje, pero estas no se utilizan para retroalimentar.",
        "Los recursos seleccionados, digitales o no, permiten recoger evidencias y brindar retroalimentación oportuna; la persona docente justifica su pertinencia.",
        "Las evidencias recogidas se utilizan para retroalimentar y tomar decisiones de ajuste en la enseñanza o el acompañamiento.",
      ],
    },
  ],
};

export const O3: Dimension = {
  id: "O3",
  titulo: "Uso pedagógico y responsable de la IA",
  criterios: [
    {
      id: "3.1",
      nombre: "Propósito y alineación del uso de IA",
      na: true,
      niveles: [
        "El uso de IA, o su restricción, no tiene un propósito identificable ni relación con el resultado de aprendizaje.",
        "La IA se usa para preparar materiales o en una actividad puntual; su relación con el resultado de aprendizaje es general.",
        "La decisión responde al resultado de aprendizaje. Se comunica al estudiantado cuando incide en su actividad.",
        "La decisión de usar, limitar o no usar IA se justifica frente a alternativas. (P) La planificación muestra su alineación con los resultados y las estrategias del curso.",
      ],
    },
    {
      id: "3.2",
      nombre: "Pensamiento crítico y verificación de resultados de IA",
      na: true,
      niveles: [
        "Los resultados de la IA se aceptan sin revisión o sustituyen el trabajo del estudiante.",
        "Se advierte sobre posibles errores de la IA, pero sus resultados no se verifican en la actividad.",
        "Los estudiantes verifican las fuentes, la lógica y la precisión de los resultados de IA y los mejoran como parte de la actividad.",
        "Los estudiantes contrastan, cuestionan y mejoran los resultados de IA para elaborar razonamientos o productos propios de orden superior.",
      ],
    },
    {
      id: "3.3",
      nombre: "Reglas de uso, evaluación e integridad académica",
      na: true,
      niveles: [
        "No se comunican reglas sobre el uso aceptable de IA en la actividad o en la evaluación.",
        "Se comunican reglas generales de uso y queda poco claro cómo se aplican a la actividad.",
        "Se aclaran los usos aceptables, su razón y la evidencia del proceso que corresponde a la actividad.",
        "Las reglas se ajustan a los riesgos de la actividad. Si hay evaluación, se valoran la transparencia y el razonamiento. (P) Se verifica en consignas o rúbricas.",
      ],
    },
    {
      id: "3.4",
      nombre: "Ética, privacidad e inclusión en el uso de IA",
      na: true,
      niveles: [
        "No se consideran la privacidad de los datos, los sesgos ni los efectos sobre estudiantes con dificultades de acceso.",
        "Se mencionan riesgos éticos, sin medidas concretas en la actividad.",
        "Se aplican medidas concretas: protección de datos, revisión de sesgos o alternativas para quienes no pueden usar la herramienta.",
        "Las medidas se ajustan a los riesgos observados y a las condiciones de acceso, conforme a las pautas institucionales aplicables.",
      ],
    },
  ],
};

export type ItemCondicion = {
  item: "4.1" | "4.2" | "4.3" | "4.4" | "4.5";
  titulo: string;
  opciones: string[];
  origen?: string[];
};

export const O4: ItemCondicion[] = [
  {
    item: "4.1",
    titulo: "Clima de aula y participación",
    opciones: ["Favorece la participación", "Participación irregular", "Limita la participación"],
  },
  {
    item: "4.2",
    titulo: "Gestión del tiempo e interrupciones",
    opciones: ["Sin interrupciones relevantes", "Interrupciones menores", "Interrupciones que afectaron la sesión"],
    origen: ["Pedagógico", "Técnico", "Institucional", "Externo"],
  },
  {
    item: "4.3",
    titulo: "Conectividad y acceso a dispositivos o plataformas",
    opciones: ["Adecuados", "Con limitaciones parciales", "Con limitaciones que afectaron la sesión", "No aplica"],
  },
  {
    item: "4.4",
    titulo: "Accesibilidad de recursos y espacios",
    opciones: ["Adecuada", "Con limitaciones parciales", "Con limitaciones que afectaron la sesión"],
  },
  {
    item: "4.5",
    titulo: "Alternativas de participación para estudiantes con dificultades de acceso o necesidades específicas",
    opciones: ["Se ofrecen", "Se ofrecen parcialmente", "No se observan", "No se requirieron"],
  },
];

export const PREGUNTAS = [
  "¿Qué necesidad pedagógica considera prioritaria en esta asignatura o experiencia?",
  "¿Cómo se relaciona la metodología activa con la tecnología utilizada o con un recurso que podría incorporarse? ¿Qué convendría mantener o ajustar?",
  "¿Qué barreras enfrenta (de acceso, tiempo, formación o institucionales) y con qué apoyos cuenta?",
  "¿Qué cambio concreto desea trabajar con su mentor o mentora en el próximo periodo?",
  "¿Cómo decidió usar, limitar o no usar la IA en esta experiencia, y qué ajustaría a partir de lo ocurrido en la sesión?",
  "¿Qué apoyo o formación en IA necesitaría para mejorar lo observado en esta experiencia?",
];

export const COMPARACION = ["Comparable", "Con diferencias", "Información insuficiente"] as const;

export const SINTESIS = [
  { clave: "practica", titulo: "Práctica observada", ayuda: "Cómo se articularon la metodología activa, la tecnología digital y el resultado de aprendizaje." },
  { clave: "fortalezas", titulo: "Fortalezas evidenciadas", ayuda: "Criterios y evidencias que las sustentan." },
  { clave: "necesidades", titulo: "Necesidades de acompañamiento", ayuda: "Criterios priorizados, evidencias y respuestas del diálogo reflexivo." },
  { clave: "condiciones", titulo: "Condiciones del caso", ayuda: "Condiciones registradas en O4 que inciden en la práctica observada." },
  { clave: "apoyos", titulo: "Apoyos acordados", ayuda: "Acciones, recursos, plazos y responsables acordados con la persona docente." },
  { clave: "seguimiento", titulo: "Seguimiento", ayuda: "En V1, acuerde qué observará en V2. En V2, indique qué ajuste o evidencia se revisará en V3." },
] as const;

export const NOTA_P = "(P) Consulte la planificación, los materiales o el diálogo.";
