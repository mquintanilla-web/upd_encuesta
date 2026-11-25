import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  // Conexión directa (sin pool) para DDL.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  await pool.query(readFileSync("db/schema.sql", "utf8"));
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"
  );
  console.log("Tablas:", rows.map((r) => r.table_name).join(", "));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
