import { enquiryAttributionSchema } from '@/lib/leadAttribution';
import { enquirySourcePath } from '@/lib/enquirySourcePath';
import { after } from 'next/server';
import { z } from 'zod';
import {
  ENQUIRY_PREP_CONSENT,
  type EnquiryRecord,
  type EnquiryResultStatus,
} from '@/lib/enquiries';
import {
  admissionsEvaluationSchema,
  validateOverallBagrutAverage,
} from '@/lib/admissionsEvaluationSchema';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { saveEnquiryBackup } from '@/server/enquiries/repository';
import { sendEnquiryToMonday } from '@/server/enquiries/monday';
import { notifyEnquiry } from '@/server/enquiries/notifications';
import { getPostHogClient } from '@/lib/posthog-server';
import { getEnquiryTarget } from '@/lib/enquiryTarget';

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
      .refine((value) => value.startsWith('/') && !value.startsWith('//'))
      .transform(enquirySourcePath),
    consent: z.literal(true),
    prepConsent: z.boolean().default(false),
    // Client evidence is ignored; only the server can supply consent text/time.
    prepConsentText: z
      .unknown()
      .optional()
      .transform(() => undefined),
    prepConsentAt: z
      .unknown()
      .optional()
      .transform(() => undefined),
    attribution: enquiryAttributionSchema.optional(),
    evaluationInput: admissionsEvaluationSchema
      .extend({
        extraInputs: admissionsEvaluationSchema.shape.extraInputs.unwrap().strict().optional(),
      })
      .strict()
      .superRefine(validateOverallBagrutAverage)
      .optional(),
  })
  .strict();

function failure(status: number, message: string) {
  return Response.json({ error: { message } }, { status });
}

async function resolveEnquiry(input: z.infer<typeof inputSchema>): Promise<EnquiryRecord | null> {
  let programName: string;
  let institutionName = '';
  let resultStatus: EnquiryResultStatus = 'unknown';
  if (input.programId === 'psychometric-preparation' && input.institutionId === '') {
    programName = 'הכנה לפסיכומטרי';
    if (input.evaluationInput) return null;
  } else {
    const target = await getEnquiryTarget(input.programId, input.institutionId);
    if (!target) return null;
    const { program, institution } = target;
    programName = program.name;
    institutionName = institution.name;
    if (input.evaluationInput) {
      const degreeId = input.evaluationInput.degreeId;
      if (degreeId !== program.id && degreeId !== canonicalProgramId(program.id)) {
        return null;
      }
      try {
        const report = await evaluateAdmissionsForProgram({
          input: input.evaluationInput,
          program,
          institutions: [institution],
        });
        const decision = report.results.find(
          (row) => row.linkedInstitutionId === institution.id,
        )?.decision;
        if (decision === 'accepted' || decision === 'below' || decision === 'eligible_to_apply') {
          resultStatus = decision;
        }
      } catch {
        console.error('[enquiries] evaluation failed', { requestId: input.requestId });
      }
    }
  }
  return {
    ...input,
    prepConsentText: input.prepConsent ? ENQUIRY_PREP_CONSENT : null,
    prepConsentAt: input.prepConsent ? new Date() : null,
    programName,
    institutionName,
    resultStatus,
    bagrut: input.evaluationInput?.bagrut ?? null,
    psychometric: input.evaluationInput?.psychometric ?? null,
    createdAt: new Date(),
  };
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return failure(403, 'יש לשלוח את הפנייה מתוך האתר.');
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return failure(415, 'פורמט הפנייה אינו תקין.');
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 24_576) return failure(413, 'הפנייה ארוכה מדי.');
  let parsed;
  try {
    parsed = inputSchema.safeParse(JSON.parse(raw));
  } catch {
    return failure(400, 'פרטי הפנייה אינם תקינים.');
  }
  if (!parsed.success) return failure(400, 'יש לבדוק את הפרטים ולאשר יצירת קשר.');

  const input = parsed.data;

  try {
    const enquiry = await resolveEnquiry(input);
    if (!enquiry) return failure(400, 'יש לבחור מסלול ומוסד מהרשימה.');
    const [monday, database] = await Promise.allSettled([
      sendEnquiryToMonday(enquiry),
      saveEnquiryBackup(enquiry),
    ]);
    if (monday.status === 'rejected') {
      console.error('[enquiries] monday write failed', { requestId: input.requestId });
    }
    if (database.status === 'rejected') {
      console.error('[enquiries] database write failed', { requestId: input.requestId });
    }
    if (monday.status === 'rejected' && database.status === 'rejected') {
      return process.env.MONDAY_API_TOKEN?.trim()
        ? failure(502, 'הפנייה לא נשלחה. הפרטים נשמרו בטופס ואפשר לנסות שוב.')
        : failure(503, 'לא ניתן לשלוח כרגע. הפרטים נשארו בטופס.');
    }
    try {
      after(async () => {
        try {
          await notifyEnquiry(enquiry, monday.status === 'fulfilled' ? monday.value : null);
        } catch {
          console.error('[enquiries] notification failed', { requestId: input.requestId });
        }
        if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim()) {
          try {
            const posthog = getPostHogClient();
            posthog.capture({
              distinctId: input.requestId,
              event: 'server_enquiry_created',
              properties: {
                ...input.attribution,
                program_id: input.programId,
                institution_id: input.institutionId,
                source_path: input.sourcePath,
                $process_person_profile: false,
              },
            });
            await posthog.flush();
          } catch {
            // Analytics must never affect lead delivery.
          }
        }
      });
    } catch {
      console.error('[enquiries] notification scheduling failed', { requestId: input.requestId });
    }
    return Response.json({ data: { received: true } }, { status: 201 });
  } catch {
    console.error('[enquiries] catalogue resolution failed', { requestId: input.requestId });
    // Never return provider errors or log submitted personal details.
    return failure(502, 'לא הצלחנו לאשר את השליחה. אפשר לנסות שוב עם אותם פרטים.');
  }
}
