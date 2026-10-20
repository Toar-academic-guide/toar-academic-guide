import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ENQUIRY_CONSENT } from '@/lib/enquiries';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';

export const runtime = 'nodejs';

const inputSchema = z
  .object({
    requestId: z.uuid(),
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s()-]/g, ''))
      .refine((value) => /^(?:0|\+972)[2-9]\d{7,8}$/.test(value)),
    programId: z.string().min(1).max(160),
    institutionId: z.string().max(100),
    sourcePath: z
      .string()
      .max(300)
      .refine((value) => value.startsWith('/') && !value.startsWith('//')),
    consent: z.literal(true),
  })
  .strict();

function failure(status: number, message: string) {
  return Response.json({ error: { message } }, { status });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return failure(403, 'יש לשלוח את הפנייה מתוך האתר.');
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return failure(415, 'פורמט הפנייה אינו תקין.');
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 8192) return failure(413, 'הפנייה ארוכה מדי.');
  let parsed;
  try {
    parsed = inputSchema.safeParse(JSON.parse(raw));
  } catch {
    return failure(400, 'פרטי הפנייה אינם תקינים.');
  }
  if (!parsed.success) return failure(400, 'יש לבדוק את הפרטים ולאשר יצירת קשר.');

  const token = process.env.MONDAY_API_TOKEN?.trim();
  if (!token) return failure(503, 'לא ניתן לשלוח כרגע. הפרטים נשארו בטופס.');
  const input = parsed.data;

  try {
    let programName: string;
    let institutionName = '';
    if (input.programId === 'psychometric-preparation' && input.institutionId === '') {
      programName = 'הכנה לפסיכומטרי';
    } else {
      const [programs, institutions] = await Promise.all([
        listCataloguePrograms(),
        listCatalogueInstitutions(),
      ]);
      const program = programs.data.find((entry) => entry.id === input.programId);
      const institution = institutions.data.find((entry) => entry.id === input.institutionId);
      if (!program || !institution || !program.linkedInstitutionIds.includes(institution.id)) {
        return failure(400, 'יש לבחור מסלול ומוסד מהרשימה.');
      }
      programName = program.name;
      institutionName = institution.name;
    }
    const now = new Date().toISOString();
    const columns = {
      phone_mm8ar2e2: {
        phone: input.phone.replace(/^0/, '+972'),
        countryShortName: 'IL',
      },
      text_mm8a6zex: programName,
      text_mm8a4c4w: institutionName,
      text_mm8ag00n: input.programId,
      text_mm8am52m: input.sourcePath,
      boolean_mm8abpda: { checked: 'true' },
      long_text_mm8ay37r: { text: ENQUIRY_CONSENT },
      date_mm8a880y: { date: now.slice(0, 10), time: now.slice(11, 19) },
      text_mm8a78k: input.requestId,
      color_mm8aqhym: { label: 'חדש' },
    };
    // A retry of this exact form must not create a second lead after a network timeout.
    const idempotencyKey = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        'API-Version': '2026-10',
        'Idempotency-Key': idempotencyKey,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        query: `mutation WebsiteEnquiry($board: ID!, $name: String!, $columns: JSON!) {
          create_item(board_id: $board, group_id: "topics", item_name: $name, column_values: $columns) { id }
        }`,
        variables: { board: '18436300533', name: input.name, columns: JSON.stringify(columns) },
      }),
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length || !result.data?.create_item?.id) {
      return failure(502, 'הפנייה לא נשלחה. הפרטים נשמרו בטופס ואפשר לנסות שוב.');
    }
    return Response.json({ data: { received: true } }, { status: 201 });
  } catch {
    // Never return provider errors or log submitted personal details.
    return failure(502, 'לא הצלחנו לאשר את השליחה. אפשר לנסות שוב עם אותם פרטים.');
  }
}
