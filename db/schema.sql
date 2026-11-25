CREATE TABLE IF NOT EXISTS ies (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
  id SERIAL PRIMARY KEY,
  creado_en TIMESTAMPTZ DEFAULT now(),
  aval_etico BOOLEAN NOT NULL,
  ies_id INT REFERENCES ies(id),
  codigo_docente TEXT,
  codigo_mentor TEXT,
  asignatura TEXT,
  codigo_catedra TEXT,
  momento TEXT CHECK (momento IN ('V1','V2')),
  fecha DATE,
  hora_inicio TIME,
  hora_cierre TIME,
  duracion_min INT,
  codigo_caso TEXT,
  modalidad TEXT CHECK (modalidad IN ('Presencial','Mixta','Virtual')),
  tarea_resultado TEXT,
  metodologia_recurso TEXT,
  evidencia_aula TEXT,
  comparacion_v1_v2 TEXT,
  diferencias TEXT,
  sintesis JSONB,
  clasificacion TEXT
);

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  observation_id INT REFERENCES observations(id) ON DELETE CASCADE,
  criterio TEXT NOT NULL,
  nivel SMALLINT,
  estado TEXT DEFAULT 'valor' CHECK (estado IN ('valor','NO','NA')),
  evidencia TEXT
);

CREATE TABLE IF NOT EXISTS condiciones (
  id SERIAL PRIMARY KEY,
  observation_id INT REFERENCES observations(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  opcion TEXT,
  origen TEXT,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS respuestas_abiertas (
  id SERIAL PRIMARY KEY,
  observation_id INT REFERENCES observations(id) ON DELETE CASCADE,
  pregunta SMALLINT,
  respuesta TEXT
);

CREATE INDEX IF NOT EXISTS scores_criterio_idx ON scores (criterio);
CREATE INDEX IF NOT EXISTS obs_momento_ies_mod_idx ON observations (momento, ies_id, modalidad);
