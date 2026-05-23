/**
 * /api/admin/stats — Next.js server-side proxy for analytics stats.
 * Forwards to analytics-router GET /api/admin/stats using the internal key.
 * Auth: x-internal-key (accepted by JwtAdminGuard dual-mode)
 */
import { NextResponse } from 'next/server';

const ANALYTICS_URL = (
  process.env.SERVER_ANALYTICS_ROUTER_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_ROUTER_URL ||
  'http://localhost:4001/api'
).replace(/\/$/, '');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function GET(req: Request) {
  if (!INTERNAL_API_KEY) {
    console.error('[API/Stats] INTERNAL_API_KEY not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to   = searchParams.get('to')   ?? '';

  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to)   query.set('to',   to);

  const url = `${ANALYTICS_URL}/admin/stats?${query.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type':   'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
      // Don't cache — always fresh
      cache: 'no-store',
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      console.error(`[API/Stats] analytics-router ${response.status}: ${err}`);
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API/Stats] Network error:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
