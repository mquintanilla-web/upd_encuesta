import { sql } from "@/lib/db";

export async function GET() {
  try {
    const [row] = await sql`SELECT now() AS ahora, current_database() AS db`;
    const [t] = await sql`SELECT count(*)::int AS tablas FROM information_schema.tables WHERE table_schema = 'public'`;
    return Response.json({ ok: true, ...row, tablas: t.tablas });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
