import { z } from 'zod';
import { unsubscribeThresholdAlerts } from '@/server/threshold-alerts/repository';

export const runtime = 'nodejs';
const schema = z.object({ token: z.uuid() }).strict();
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

export async function POST(request: Request) {
  // Token possession is the only authority; no account cookies are consulted.
  let token: string;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1024) throw new Error('Too large');
    token = schema.parse(JSON.parse(raw)).token;
  } catch {
    return Response.json({ error: 'הקישור אינו תקין.' }, { status: 400, headers });
  }
  try {
    const found = await unsubscribeThresholdAlerts(token);
    return Response.json(
      found ? { data: { unsubscribed: true } } : { error: 'הקישור אינו תקין.' },
      { status: found ? 200 : 410, headers },
    );
  } catch {
    // Do not log the bearer token or any contact details.
    return Response.json({ error: 'לא הצלחנו להסיר כרגע. נסו שוב.' }, { status: 503, headers });
  }
}
