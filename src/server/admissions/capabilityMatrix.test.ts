import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildAdmissionsCapabilityMatrix } from './capabilityMatrix';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { SourceFreshnessStateRow } from '@/db/types';

function makeFreshnessState(overrides: Partial<SourceFreshnessStateRow>): SourceFreshnessStateRow {
  return {
    sourceId: 'test',
    sourceUrl: 'https://example.com',
    status: 'fresh',
    capability: 'decision_capable',
    lastCheckedAt: new Date('2026-06-28T00:00:00Z'),
    lastSuccessfulCheckAt: new Date('2026-06-28T00:00:00Z'),
    lastChangedAt: null,
    reason: null,
    latestReviewItemId: null,
    nextAction: null,
    createdAt: new Date('2026-06-28T00:00:00Z'),
    updatedAt: new Date('2026-06-28T00:00:00Z'),
    sourceClass: 'api_static_json',
    ...overrides,
  } as SourceFreshnessStateRow;
}

const INSTITUTIONS: CatalogueInstitution[] = [
  { id: 'tau', name: 'TAU', region: 'center', domain: 'tau.ac.il', universityId: 'tau' },
  { id: 'haifa', name: 'Haifa', region: 'north', domain: 'haifa.ac.il', universityId: 'haifa' },
  { id: 'huji', name: 'HUJI', region: 'center', domain: 'huji.ac.il', universityId: 'huji' },
  {
    id: 'technion',
    name: 'Technion',
    region: 'north',
    domain: 'technion.ac.il',
    universityId: 'technion',
  },
  { id: 'bgu', name: 'BGU', region: 'south', domain: 'bgu.ac.il', universityId: 'bgu' },
  { id: 'biu', name: 'BIU', region: 'center', domain: 'biu.ac.il', universityId: 'biu' },
  { id: 'ariel', name: 'Ariel', region: 'center', domain: 'ariel.ac.il', universityId: 'ariel' },
  {
    id: 'open_university',
    name: 'OpenU',
    region: 'center',
    domain: 'openu.ac.il',
    universityId: 'open_university',
  },
  {
    id: 'reichman',
    name: 'Reichman',
    region: 'center',
    domain: 'runi.ac.il',
    universityId: 'reichman',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה מקומית',
      sekhemWeight: { psy: 0.6, bag: 0.4 },
    },
  },
  {
    id: 'afeka',
    name: 'Afeka',
    region: 'center',
    domain: 'afeka.ac.il',
    universityId: 'afeka',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'ציון התאמה אפקה',
      sekhemWeight: { psy: 0.5, bag: 0.5 },
    },
  },
  {
    id: 'hit',
    name: 'HIT',
    region: 'center',
    domain: 'hit.ac.il',
    universityId: 'hit',
    calculatorConfig: {
      formulaType: 'minimum_floors',
      scaleDescription: 'תנאי סף',
      minPsychometric: 550,
      minBagrut: 85,
    },
  },
  {
    id: 'shenkar',
    name: 'Shenkar',
    region: 'center',
    domain: 'shenkar.ac.il',
    universityId: 'shenkar',
  },
  { id: 'mta', name: 'MTA', region: 'center', domain: 'mta.ac.il', universityId: 'mta' },
];

function makeProgram(overrides: Partial<CatalogueProgram> = {}): CatalogueProgram {
  return {
    id: 'test_program',
    name: 'Test Program',
    institution: 'Test',
    type: 'academic',
    category: 'test',
    profileScore: { AN: 0, TE: 0, CR: 0, SO: 0, LE: 0, OR: 0, DI: 0, ER: 0 },
    admissionType: 'requirements',
    admissionRequirements: [],
    linkedInstitutionIds: [],
    ...overrides,
  };
}

describe('buildAdmissionsCapabilityMatrix', () => {
  it('returns exact for a verified TAU exact target with fresh source and no required inputs', () => {
    const program = makeProgram({
      id: 'tau_datascience',
      linkedInstitutionIds: ['tau'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const tauEntry = entries.find((e) => e.institutionId === 'tau');
    expect(tauEntry?.capability).toBe('exact');
  });

  it('returns needs_input for Haifa exact target when required inputs are present', () => {
    const program = makeProgram({
      id: 'haifa_cs',
      linkedInstitutionIds: ['haifa'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const haifaEntry = entries.find((e) => e.institutionId === 'haifa');
    expect(haifaEntry?.capability).toBe('needs_input');
    expect(haifaEntry?.requiredInputs).toEqual([
      'psychometric_math',
      'psychometric_verbal',
      'psychometric_english',
    ]);
  });

  it('returns open_admission for Open University', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['open_university'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const openEntry = entries.find((e) => e.institutionId === 'open_university');
    expect(openEntry?.capability).toBe('open_admission');
  });

  it('returns manual_gate for Shenkar', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['shenkar'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const shenkarEntry = entries.find((e) => e.institutionId === 'shenkar');
    expect(shenkarEntry?.capability).toBe('manual_gate');
  });

  it('returns requirements_only for MTA', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['mta'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const mtaEntry = entries.find((e) => e.institutionId === 'mta');
    expect(mtaEntry?.capability).toBe('requirements_only');
  });

  it('returns blocked for BIU and Ariel', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['biu', 'ariel'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const biuEntry = entries.find((e) => e.institutionId === 'biu');
    const arielEntry = entries.find((e) => e.institutionId === 'ariel');
    expect(biuEntry?.capability).toBe('blocked');
    expect(arielEntry?.capability).toBe('blocked');
  });

  it('returns score_only for Technion and BGU partial sources', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['technion', 'bgu'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const technionEntry = entries.find((e) => e.institutionId === 'technion');
    const bguEntry = entries.find((e) => e.institutionId === 'bgu');
    expect(technionEntry?.capability).toBe('score_only');
    expect(bguEntry?.capability).toBe('score_only');
  });

  it('returns estimated for Reichman, Afeka, and HIT with partial source targets and thresholds', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['reichman', 'afeka', 'hit'],
      thresholds: { reichman: 500, afeka: 500, hit: 550 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    for (const id of ['reichman', 'afeka', 'hit']) {
      const entry = entries.find((e) => e.institutionId === id);
      expect(entry?.capability).toBe('estimated');
    }
  });

  it('returns score_only when a partial source target exists but no threshold is set', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['reichman'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const entry = entries.find((e) => e.institutionId === 'reichman');
    expect(entry?.capability).toBe('score_only');
  });

  it('returns missing for an institution with no source target and no calculator config', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['bezalel'],
    });

    const bezalelInstitution: CatalogueInstitution = {
      id: 'bezalel',
      name: 'Bezalel',
      region: 'center',
      domain: 'bezalel.ac.il',
      universityId: 'bezalel',
    };

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: [...INSTITUTIONS, bezalelInstitution],
    });

    const entry = entries.find((e) => e.institutionId === 'bezalel');
    expect(entry?.capability).toBe('missing');
  });

  it('returns manual_gate for a requirements program with curated manual requirements', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['bezalel'],
      admissionRequirements: ['תיק עבודות', 'ראיון קבלה'],
    });

    const bezalelInstitution: CatalogueInstitution = {
      id: 'bezalel',
      name: 'Bezalel',
      region: 'center',
      domain: 'bezalel.ac.il',
      universityId: 'bezalel',
    };

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: [...INSTITUTIONS, bezalelInstitution],
    });

    const entry = entries.find((e) => e.institutionId === 'bezalel');
    expect(entry?.capability).toBe('manual_gate');
  });

  it('degrades exact to blocked when freshness state is blocked', () => {
    const program = makeProgram({
      id: 'tau_datascience',
      linkedInstitutionIds: ['tau'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      freshnessStatesBySourceId: new Map([
        [
          'tau-digital-sciences-live',
          makeFreshnessState({ sourceId: 'tau-digital-sciences-live', status: 'blocked' }),
        ],
      ]),
    });

    const entry = entries.find((e) => e.institutionId === 'tau');
    expect(entry?.capability).toBe('blocked');
  });

  it('degrades exact to stale when freshness state is failed', () => {
    const program = makeProgram({
      id: 'tau_datascience',
      linkedInstitutionIds: ['tau'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      freshnessStatesBySourceId: new Map([
        [
          'tau-digital-sciences-live',
          makeFreshnessState({ sourceId: 'tau-digital-sciences-live', status: 'failed' }),
        ],
      ]),
    });

    const entry = entries.find((e) => e.institutionId === 'tau');
    expect(entry?.capability).toBe('stale');
  });
});
