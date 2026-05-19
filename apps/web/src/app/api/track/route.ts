import { NextResponse } from 'next/server';

// Use internal docker networking if available, fallback to public URL for local dev
const ANALYTICS_ROUTER_URL = process.env.SERVER_ANALYTICS_ROUTER_URL || process.env.NEXT_PUBLIC_ANALYTICS_ROUTER_URL || 'http://localhost:4001/api';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: Request) {
  try {
    if (!INTERNAL_API_KEY) {
      console.error('[API/Track] INTERNAL_API_KEY is not configured in environment variables.');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const body = await req.json();

    // Extract client IP and User-Agent
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Forward the request to the analytics-router (Edge Worker)
    const url = `${ANALYTICS_ROUTER_URL.replace(/\/$/, '')}/event`;
    
    // Create the payload exactly as expected by TrackEventDto
    const payload = {
      ...body,
      clientIp,
      userAgent,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
        // Also send X-Forwarded-For manually so the worker sees the real client IP
        'X-Forwarded-For': clientIp,
        'User-Agent': userAgent,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API/Track] Failed to dispatch to analytics-router. Status: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to process analytics event' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 202 });

  } catch (error) {
    console.error('[API/Track] Error proxying analytics event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
