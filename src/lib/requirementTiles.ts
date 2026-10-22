import type { Program } from '@/data/degrees/types';
import { INSTITUTION_BY_ID, type InstitutionId } from '@/data/institutions';
import repair from '@/data/admissions/catalogueContentRepair.json';
import officialFour from '../../docs/admissions-verification/2026-10-22-official-requirements-4.json';
import { BGU_SOCIAL_SCIENCE_RULES } from '@/data/admissions/bguSocialScienceRules';
import { requirementTileOverrides } from './requirementTileOverrides';
import { institutionLink } from './institutionLinks';

export interface RequirementTile {
  value: number | 'המכללה מחליטה';
  label: string;
  qualifiers: string[];
}
export interface RequirementTilesModel {
  semantics: 'alternatives' | 'cumulative';
  tiles: RequirementTile[];
  chips: string[];
  details: string[];
  supplementalDetails?: string[];
}
export type RequirementTilesSelection =
  | { model: RequirementTilesModel; reason?: never }
  | {
      model?: never;
      reason:
        | 'unlisted'
        | 'incomplete'
        | 'unverified'
        | 'stale'
        | 'changed'
        | 'unclear_semantics'
        | 'insufficient_structured_data';
    };

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((text, i) => text === b[i]);
const recent = (date: string, now: Date) => {
  const age = now.getTime() - new Date(date).getTime();
  // Number summaries expire; the complete source list remains available afterwards.
  return Number.isFinite(age) && age >= 0 && age <= 30 * 24 * 60 * 60 * 1000;
};

export function selectRequirementTiles({
  program,
  institutionId,
  requirements,
  now = new Date(),
  verificationIssue,
}: {
  program: Program;
  institutionId: string;
  requirements: string[];
  now?: Date;
  verificationIssue?: string;
}): RequirementTilesSelection {
  if (
    verificationIssue &&
    /incomplete|stale|unverified|placeholder|blocked_official/.test(verificationIssue)
  )
    return { reason: verificationIssue.includes('incomplete') ? 'incomplete' : 'unverified' };
  if (program.isListed === false) return { reason: 'unlisted' };
  const detail = program.institutionDetails?.find(
    (d) => d.institutionName === INSTITUTION_BY_ID[institutionId as InstitutionId]?.name,
  );
  const row = repair.requirements.find(
    (r) => r.programId === program.id && r.institutionId === institutionId,
  );
  if (row?.coverage === 'incomplete_published_requirements') return { reason: 'incomplete' };
  const override = requirementTileOverrides[program.id as keyof typeof requirementTileOverrides];
  if (override) {
    const evidence = Object.values(officialFour).find(
      (r) => r.program === program.id && r.institution === institutionId,
    );
    if (
      !evidence ||
      !same(program.admissionRequirements, evidence.reqs) ||
      !same(detail?.specificAdmissionNotes ?? [], evidence.notes) ||
      !same(requirements, [...evidence.reqs, ...evidence.notes])
    )
      return { reason: 'changed' };
    if (!recent('2026-10-22', now)) return { reason: 'stale' };
    return { model: override };
  }
  if (
    !row ||
    row.coverage !== 'published_conditions' ||
    !row.sourceSha256 ||
    !institutionLink(row.sourceUrl, institutionId, { fallbackToWebsite: false })
  )
    return { reason: 'unverified' };
  if (!recent(row.checkedAt, now)) return { reason: 'stale' };
  if (!same(detail?.specificAdmissionNotes ?? [], row.notes) || !same(requirements, row.notes))
    return { reason: 'changed' };

  // These are the evaluator's reviewed ordinary routes, not legacy score estimates.
  const routeId = program.id === 'bgu_socialwork' ? 'social_work' : program.id;
  const routes =
    institutionId === 'bgu'
      ? BGU_SOCIAL_SCIENCE_RULES[routeId as keyof typeof BGU_SOCIAL_SCIENCE_RULES]
      : undefined;
  if (routes && routes.operator === 'or') {
    const expected = `סכם ${routes.score} לפחות או פסיכומטרי ${routes.psychometric} לפחות`;
    const average = `ממוצע בגרות ${routes.bagrut} לפחות`;
    if (!row.notes[0].includes(expected) || !row.notes[1]?.includes(average))
      return { reason: 'changed' };
    return {
      model: {
        semantics: 'alternatives',
        tiles: [
          { value: routes.score, label: 'סכם', qualifiers: ['במסלול הדו־מחלקתי'] },
          { value: routes.psychometric, label: 'פסיכומטרי', qualifiers: ['במסלול הדו־מחלקתי'] },
          {
            value: routes.bagrut,
            label: 'בגרות',
            qualifiers: ['ללא פסיכומטרי', 'במסלול הדו־מחלקתי'],
          },
        ],
        chips: ['דרישות השפה והחוג'],
        details: requirements,
      },
    };
  }

  // Only a complete, explicit conjunction corroborates cumulative catalogue gates.
  // Never treat an alternative mentioned elsewhere as another required minimum.
  const first = row.notes[0] ?? '';
  const cumulative =
    /^(?:סכם (\d+(?:\.\d+)?) לפחות וגם פסיכומטרי (\d+(?:\.\d+)?) לפחות)([^\d]*)$/.exec(first);
  if (cumulative && !row.notes.some((t) => /אפיק|חלופ|ללא פסיכומטרי|או פסיכומטרי/.test(t))) {
    const threshold =
      program.thresholds?.[institutionId as keyof NonNullable<Program['thresholds']>];
    const psychometric =
      program.minimumPsychometric?.[
        institutionId as keyof NonNullable<Program['minimumPsychometric']>
      ];
    if (threshold !== Number(cumulative[1]) || psychometric !== Number(cumulative[2]))
      return { reason: 'changed' };
    const qualifier = /ריאיון|ראיון|מיון/.test(cumulative[3]) ? ['לצורך מיון, ללא הבטחת קבלה'] : [];
    return {
      model: {
        semantics: 'cumulative',
        tiles: [
          { value: threshold, label: 'סכם', qualifiers: qualifier },
          { value: psychometric, label: 'פסיכומטרי', qualifiers: qualifier },
        ],
        chips: [],
        details: requirements,
      },
    };
  }
  const structured =
    Object.values(program.thresholds ?? {}).some((v) => v != null) ||
    !!detail?.admissionFacts?.some((f) => f.kind === 'numeric_gate');
  return { reason: structured ? 'unclear_semantics' : 'insufficient_structured_data' };
}
