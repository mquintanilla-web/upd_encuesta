import { neon } from "@neondatabase/serverless";

// Conexión HTTP serverless sobre la URL con pool (compatible con Vercel).
export const sql = neon(process.env.DATABASE_URL!);
