import { unsubscribeAdmissionAlerts } from '@/server/admission-alerts/unsubscribeService';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  // No account cookie is authority here; only possession of the category-scoped token is.
  let token: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return Response.json({ error: 'Invalid link.' }, { status: 400 });
    token = JSON.parse(raw)?.token;
  } catch {
    return Response.json({ error: 'Invalid link.' }, { status: 400 });
  }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return Response.json({ error: 'Invalid link.' }, { status: 400 });
  }
  try {
    const data = await unsubscribeAdmissionAlerts(token);
    return Response.json(
      { data },
      { status: data.status === 'invalid' ? 410 : 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'Unable to unsubscribe. Please try again.' }, { status: 503 });
  }
}
