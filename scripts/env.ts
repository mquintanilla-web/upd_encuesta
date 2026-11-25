import { config } from "dotenv";

// Debe importarse primero: carga .env.local antes de que src/lib/db.ts lea DATABASE_URL.
config({ path: ".env.local", quiet: true });
