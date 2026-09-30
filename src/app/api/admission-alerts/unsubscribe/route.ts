import {
  unsubscribeAdmissionAlerts,
  getAdmissionAlertUnsubscribeStatus,
} from '@/server/admission-alerts/unsubscribeService';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  // No account cookie is authority here; only possession of the category-scoped token is.
  let token: unknown;
  let action: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return Response.json({ error: 'Invalid link.' }, { status: 400 });
    const body = JSON.parse(raw);
    token = body?.token;
    action = body?.action;
  } catch {
    return Response.json({ error: 'Invalid link.' }, { status: 400 });
  }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return Response.json({ error: 'Invalid link.' }, { status: 400 });
  }
  if (action !== undefined && action !== 'status')
    return Response.json({ error: 'Invalid action.' }, { status: 400 });
  try {
    // Keep the token in the request body, never in logged URL query parameters.
    const data =
      action === 'status'
        ? await getAdmissionAlertUnsubscribeStatus(token)
        : await unsubscribeAdmissionAlerts(token);
    return Response.json(
      { data },
      { status: data.status === 'invalid' ? 410 : 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'Unable to unsubscribe. Please try again.' }, { status: 503 });
  }
}
