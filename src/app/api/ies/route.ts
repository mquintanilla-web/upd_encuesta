import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT codigo, nombre FROM ies ORDER BY nombre`;
  return Response.json(rows);
}
