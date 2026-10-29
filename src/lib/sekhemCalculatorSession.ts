import { z } from 'zod';
import { SECTORS } from '@/data/bagrutSubjects';
import { MAX_BAGRUT_SUBJECTS } from './bagrutSubjectLimits';
import { HAIFA_PROFILE_KEYS, type HaifaAdmissionsInputs } from './haifaAdmissionsInputs';
import { admissionsEvaluationSchema } from './admissionsEvaluationSchema';
import type { CalculatorProfile, CalculatorOffering } from './sekhemCalculator';
import type { HaifaQualificationValues } from '@/components/HaifaQualificationFields';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';

export const SEKHEM_SESSION_KEY = 'myway:sekhem-calculator:v1';
export interface SekhemCalculatorSnapshot extends CalculatorProfile {
  programId: string;
  requiredKeys: (keyof HaifaAdmissionsInputs)[];
  haifaValues: HaifaQualificationValues;
  reports: AdmissionsEvaluationReport[];
  failedIds: string[];
}

// Store only the report fields used by result presentation and enquiry attribution.
const resultSchema = z.object({
  institution: z.object({ id: z.string(), name: z.string(), region: z.string() }),
  linkedInstitutionId: z.string(),
  kind: z.enum([
    'exact',
    'estimated',
    'needs_input',
    'authority_unavailable',
    'tracked_missing_rule',
    'unsupported',
    'degraded',
    'open_admission',
    'manual_gate',
    'requirements_only',
  ]),
  capability: z.enum([
    'exact',
    'estimated',
    'score_only',
    'blocked',
    'stale',
    'missing',
    'needs_input',
    'authority_unavailable',
    'tracked_missing_rule',
    'unsupported',
    'open_admission',
    'manual_gate',
    'requirements_only',
  ]),
  decision: z.enum(['accepted', 'below', 'eligible_to_apply', 'pending', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low']),
  sourceLabel: z.string(),
  explanation: z.string(),
  nextAction: z.string(),
  score: z.number().optional(),
  threshold: z.number().nullable().optional(),
  scoreAssessment: z.enum(['meets_threshold', 'below_threshold']).optional(),
  requiredInputs: z.array(z.string()).optional(),
  additionalConditions: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        status: z.enum(['confirmed', 'unconfirmed', 'unmet']),
      }),
    )
    .optional(),
});
const snapshotSchema = z.object({
  version: z.literal(1),
  rows: z
    .array(
      z.object({
        label: z.string(),
        units: z.union([z.number(), z.literal('')]),
        grade: z.union([z.number(), z.literal('')]),
        assessmentKind: z.enum(['exam', 'final_project', 'combined']).optional(),
      }),
    )
    .max(MAX_BAGRUT_SUBJECTS),
  sector: z.string().refine((value) => Object.hasOwn(SECTORS, value)),
  certificate: z.enum(['other', 'internal', 'external_1977_or_later']),
  psychometric: z.string(),
  verbal: z.string(),
  quantitative: z.string(),
  english: z.string(),
  programId: z.string(),
  requiredKeys: z.array(z.enum(HAIFA_PROFILE_KEYS)),
  haifaValues: z.object(
    Object.fromEntries(HAIFA_PROFILE_KEYS.map((key) => [key, z.string().optional()])),
  ),
  reports: z.array(
    z.object({
      generatedAt: z.string(),
      evaluatorVersion: z.string(),
      inputDigest: z.string(),
      input: admissionsEvaluationSchema,
      program: z.object({ id: z.string(), name: z.string() }),
      results: z.array(resultSchema),
    }),
  ),
  failedIds: z.array(z.string()),
});

export function readSekhemSession(
  offerings: CalculatorOffering[],
): SekhemCalculatorSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(SEKHEM_SESSION_KEY);
    if (!raw) return null;
    const parsed = snapshotSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { version: _version, ...snapshot } = parsed.data;
    const offered = (id: string) => offerings.some((row) => row.programId === id);
    if (
      (snapshot.programId && !offered(snapshot.programId)) ||
      snapshot.failedIds.some((id) => !offered(id)) ||
      snapshot.reports.some(
        (report) =>
          !offered(report.input.degreeId) ||
          report.program.id !== report.input.degreeId ||
          (snapshot.programId && report.input.degreeId !== snapshot.programId) ||
          !report.results.some((result) =>
            offerings.some(
              (row) =>
                row.programId === report.input.degreeId &&
                row.institutionId === result.linkedInstitutionId,
            ),
          ),
      )
    )
      return null;
    return snapshot as SekhemCalculatorSnapshot;
  } catch {
    return null;
  }
}

export function writeSekhemSession(snapshot: SekhemCalculatorSnapshot): void {
  try {
    const parsed = snapshotSchema.safeParse({ ...snapshot, version: 1 });
    if (parsed.success)
      window.sessionStorage.setItem(SEKHEM_SESSION_KEY, JSON.stringify(parsed.data));
  } catch {
    // Privacy settings and storage limits must never prevent calculation.
  }
}
