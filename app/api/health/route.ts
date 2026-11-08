export const dynamic = 'force-dynamic';

export function GET() {
  // DB ping is added with the schema (issue #4).
  return Response.json({ ok: true, time: new Date().toISOString() });
}
