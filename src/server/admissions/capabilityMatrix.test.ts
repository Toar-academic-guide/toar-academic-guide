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
    calculatorConfig: {
      formulaType: 'technion_linear',
      scaleDescription: 'סקאלה 60-100',
    },
  },
  {
    id: 'bgu',
    name: 'BGU',
    region: 'south',
    domain: 'bgu.ac.il',
    universityId: 'bgu',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה מוסדית',
      sekhemWeight: { psy: 0.5, bag: 0.5 },
    },
  },
  { id: 'biu', name: 'BIU', region: 'center', domain: 'biu.ac.il', universityId: 'biu' },
  {
    id: 'ariel',
    name: 'Ariel',
    region: 'center',
    domain: 'ariel.ac.il',
    universityId: 'ariel',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
      sekhemWeight: { psy: 0.5, bag: 0.5 },
    },
  },
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
  it('uses the recent reviewed proof while asking for required TAU inputs', () => {
    const [entry] = buildAdmissionsCapabilityMatrix({
      program: makeProgram({
        id: 'tau_datascience',
        linkedInstitutionIds: ['tau'],
      }),
      institutions: INSTITUTIONS,
    });

    expect(entry).toMatchObject({
      institutionId: 'tau',
      capability: 'needs_input',
      pairVerification: {
        pairId: 'tau_datascience__tau',
        state: 'exact',
      },
    });
  });

  it('withdraws the TAU pair after the checked-in proof freshness window expires', () => {
    const program = makeProgram({
      id: 'tau_datascience',
      linkedInstitutionIds: ['tau'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      now: new Date('2026-08-04T00:00:00Z'),
    });

    const tauEntry = entries.find((e) => e.institutionId === 'tau');
    expect(tauEntry?.capability).toBe('stale');
  });

  it('activates the TAU pair only with matching source proof and required inputs', () => {
    const [entry] = buildAdmissionsCapabilityMatrix({
      program: makeProgram({
        id: 'tau_datascience',
        linkedInstitutionIds: ['tau'],
      }),
      institutions: INSTITUTIONS,
      input: {
        psychometricEnglish: 110,
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
        },
      },
      freshnessStatesBySourceId: new Map([
        [
          'tau-digital-sciences-live',
          makeFreshnessState({
            sourceId: 'tau-digital-sciences-live',
            normalizedFingerprint:
              '62a6a2f398b737b2139671f32c48a921083a4966ea43e8135c081870d42e9971',
            lastCheckedAt: new Date('2026-07-25T20:12:07Z'),
            lastSuccessfulCheckAt: new Date('2026-07-25T20:12:07Z'),
          }),
        ],
      ]),
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(entry).toMatchObject({
      institutionId: 'tau',
      capability: 'exact',
      exactTarget: {
        requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
      },
    });
  });

  it('treats verified TAU Nursing as exact only after the English input is supplied', () => {
    const program = makeProgram({
      id: 'nursing',
      linkedInstitutionIds: ['tau'],
    });
    const [missingInput] = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      now: new Date('2026-07-25T21:00:00Z'),
    });
    const [exact] = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      input: { psychometricEnglish: 110 },
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(missingInput).toMatchObject({
      capability: 'needs_input',
      requiredInputs: ['psychometric_english'],
      pairVerification: { pairId: 'nursing__tau', state: 'exact' },
    });
    expect(exact).toMatchObject({
      capability: 'exact',
      exactTarget: { targetId: 'tau-nursing-live' },
    });
  });

  it('treats node-specific TAU Psychology as exact only after the English input is supplied', () => {
    const program = makeProgram({
      id: 'tau_psychology',
      linkedInstitutionIds: ['tau'],
    });
    const [missingInput] = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      now: new Date('2026-07-25T21:00:00Z'),
    });
    const [exact] = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      input: { psychometricEnglish: 110 },
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(missingInput).toMatchObject({
      capability: 'needs_input',
      requiredInputs: ['psychometric_english'],
      pairVerification: { pairId: 'tau_psychology__tau', state: 'exact' },
    });
    expect(exact).toMatchObject({
      capability: 'exact',
      exactTarget: { targetId: 'tau-psychology-live' },
    });
  });

  it('activates the reviewed TAU Social Work score route with its pair-specific target', () => {
    const [entry] = buildAdmissionsCapabilityMatrix({
      program: makeProgram({
        id: 'social_work',
        linkedInstitutionIds: ['tau'],
      }),
      institutions: INSTITUTIONS,
      now: new Date('2026-07-26T08:00:00Z'),
    });

    expect(entry).toMatchObject({
      institutionId: 'tau',
      capability: 'exact',
      pairVerification: { pairId: 'social_work__tau', state: 'exact' },
      exactTarget: { targetId: 'tau-social-work-live', requiredInputs: [] },
    });
  });

  it('replaces the legacy TAU Social Work threshold with the reviewed programme target', () => {
    const [entry] = buildAdmissionsCapabilityMatrix({
      program: makeProgram({
        id: 'tau_socialwork',
        linkedInstitutionIds: ['tau'],
      }),
      institutions: INSTITUTIONS,
      now: new Date('2026-07-26T08:00:00Z'),
    });

    expect(entry).toMatchObject({
      institutionId: 'tau',
      capability: 'exact',
      pairVerification: { pairId: 'tau_socialwork__tau', state: 'exact' },
      exactTarget: { targetId: 'tau-social-work-legacy-live', requiredInputs: [] },
    });
  });

  it('checks Haifa pair proof before asking for calculator inputs', () => {
    const program = makeProgram({
      id: 'haifa_cs',
      linkedInstitutionIds: ['haifa'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const haifaEntry = entries.find((e) => e.institutionId === 'haifa');
    expect(haifaEntry?.capability).toBe('authority_unavailable');
    expect(haifaEntry?.requiredInputs).toBeUndefined();
  });

  it('does not promote Haifa from supplied inputs alone', () => {
    const program = makeProgram({
      id: 'haifa_cs',
      linkedInstitutionIds: ['haifa'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
      input: {
        psychometricMath: 120,
        psychometricVerbal: 120,
        psychometricEnglish: 120,
      },
    });

    const haifaEntry = entries.find((entry) => entry.institutionId === 'haifa');
    expect(haifaEntry?.capability).toBe('authority_unavailable');
    expect(haifaEntry?.requiredInputs).toBeUndefined();
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

  it('promotes Monday manual evidence for MTA to manual_gate', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['mta'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const mtaEntry = entries.find((e) => e.institutionId === 'mta');
    expect(mtaEntry?.capability).toBe('manual_gate');
  });

  it('keeps Ariel blocked while promoting BIU to a manual-gate application path once current official BIU pages publish admissions routes', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['biu', 'ariel'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const biuEntry = entries.find((e) => e.institutionId === 'biu');
    const arielEntry = entries.find((e) => e.institutionId === 'ariel');
    expect(biuEntry?.capability).toBe('manual_gate');
    expect(arielEntry?.capability).toBe('tracked_missing_rule');
  });

  it('marks an explicitly excluded Ariel formula pair as unsupported', () => {
    const program = makeProgram({
      id: 'ariel_cs',
      linkedInstitutionIds: ['ariel'],
      thresholds: { ariel: 600 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const arielEntry = entries.find((e) => e.institutionId === 'ariel');
    expect(arielEntry?.capability).toBe('unsupported');
    expect(arielEntry?.formulaPairScope).toBe('excluded');
    expect(arielEntry?.evidence?.capabilityCandidate).toBe(
      'score_only_or_formula_without_verified_cutoff',
    );
    expect(arielEntry?.evidence?.officialVerificationStatus).toBe(
      'blocked_needs_alternate_official_source',
    );
  });

  it('keeps partial institutions score-only when no verified program match exists and no official gap remains', () => {
    const program = makeProgram({
      id: 'technion_datascience',
      linkedInstitutionIds: ['technion', 'bgu'],
      thresholds: { technion: 91, bgu: null },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const technionEntry = entries.find((e) => e.institutionId === 'technion');
    const bguEntry = entries.find((e) => e.institutionId === 'bgu');
    expect(technionEntry?.capability).toBe('authority_unavailable');
    expect(technionEntry?.evidence?.missingData ?? []).toHaveLength(0);
    expect(bguEntry?.capability).toBe('score_only');
    expect(bguEntry?.evidence?.missingData ?? []).toHaveLength(0);
  });

  it('does not promote a BGU threshold without score-and-verdict proof', () => {
    const program = makeProgram({
      id: 'bgu_cs',
      linkedInstitutionIds: ['bgu'],
      thresholds: { bgu: 720 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const bguEntry = entries.find((e) => e.institutionId === 'bgu');
    expect(bguEntry?.capability).toBe('authority_unavailable');
    expect(bguEntry?.evidence?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_cs',
          threshold: 720,
        }),
      ]),
    );
  });

  it('keeps additional BGU threshold-only pairs withheld', () => {
    const program = makeProgram({
      id: 'bgu_ee',
      linkedInstitutionIds: ['bgu'],
      thresholds: { bgu: 547 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const bguEntry = entries.find((e) => e.institutionId === 'bgu');
    expect(bguEntry?.capability).toBe('authority_unavailable');
    expect(bguEntry?.evidence?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_ee',
          threshold: 547,
        }),
      ]),
    );
  });

  it('withholds Technion medicine until the pair contract proves its complete gate flow', () => {
    const program = makeProgram({
      id: 'technion_medicine',
      linkedInstitutionIds: ['technion'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const technionEntry = entries.find((e) => e.institutionId === 'technion');
    expect(technionEntry?.capability).toBe('authority_unavailable');
    expect(technionEntry?.evidence?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_medicine',
          threshold: 92,
          thresholdKind: 'invitation_to_manual_gate',
        }),
      ]),
    );
  });

  it('withholds BGU nursing until its invitation flow has pair fixtures', () => {
    const program = makeProgram({
      id: 'bgu_nursing',
      linkedInstitutionIds: ['bgu'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const bguEntry = entries.find((e) => e.institutionId === 'bgu');
    expect(bguEntry?.capability).toBe('authority_unavailable');
    expect(bguEntry?.evidence?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_nursing',
          threshold: 520,
          thresholdKind: 'invitation_to_manual_gate',
          scoreKind: 'psychometric',
        }),
      ]),
    );
  });

  it('withholds BGU medicine until the score and invitation verdict are replayed', () => {
    const program = makeProgram({
      id: 'bgu_medicine',
      linkedInstitutionIds: ['bgu'],
      thresholds: { bgu: null },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const bguEntry = entries.find((e) => e.institutionId === 'bgu');
    expect(bguEntry?.capability).toBe('authority_unavailable');
    expect(bguEntry?.evidence?.officialUrls).toContain(
      'https://www.bgu.ac.il/welcome/ba/catalog/categories/medical-school/?tab=2944',
    );
    expect(bguEntry?.evidence?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_medicine',
          threshold: 735,
          thresholdKind: 'invitation_to_manual_gate',
          scoreKind: 'sekhem',
        }),
      ]),
    );
  });

  it('does not promote a Technion threshold without a verified score replay', () => {
    const program = makeProgram({
      id: 'technion_cs',
      linkedInstitutionIds: ['technion'],
      thresholds: { technion: 91 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const technionEntry = entries.find((e) => e.institutionId === 'technion');
    expect(technionEntry?.capability).toBe('authority_unavailable');
    expect(technionEntry?.evidence?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_cs',
          threshold: 91,
        }),
      ]),
    );
  });

  it('keeps a drifted Technion catalogue threshold unavailable', () => {
    const program = makeProgram({
      id: 'technion_cs',
      linkedInstitutionIds: ['technion'],
      thresholds: { technion: 92 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const technionEntry = entries.find((e) => e.institutionId === 'technion');
    expect(technionEntry?.capability).toBe('authority_unavailable');
  });

  it('returns estimated for Afeka and HIT with partial source targets and thresholds', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['afeka', 'hit'],
      thresholds: { afeka: 500, hit: 550 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    for (const id of ['afeka', 'hit']) {
      const entry = entries.find((e) => e.institutionId === id);
      expect(entry?.capability).toBe('estimated');
    }
  });

  it('promotes Reichman to manual_gate once the official bagrut-average rule is verified', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['reichman'],
      thresholds: { reichman: 500 },
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const entry = entries.find((e) => e.institutionId === 'reichman');
    expect(entry?.capability).toBe('manual_gate');
    expect(entry?.evidence?.publicBucket).toBe('eligible_with_manual_gate');
    expect(entry?.evidence?.officialVerificationStatus).toBe('partial_official_rule_verified');
  });

  it('promotes Colman to manual_gate once official programme pages confirm automatic and fallback routes', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['colman'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const entry = entries.find((e) => e.institutionId === 'colman');
    expect(entry?.capability).toBe('manual_gate');
    expect(entry?.evidence?.publicBucket).toBe('eligible_with_manual_gate');
    expect(entry?.evidence?.officialVerificationStatus).toBe('partial_official_rule_verified');
  });

  it('promotes Ono to manual_gate once current official programme pages confirm automatic and alternate routes', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['ono'],
    });

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: INSTITUTIONS,
    });

    const entry = entries.find((e) => e.institutionId === 'ono');
    expect(entry?.capability).toBe('manual_gate');
    expect(entry?.evidence?.publicBucket).toBe('eligible_with_manual_gate');
    expect(entry?.evidence?.officialVerificationStatus).toBe('partial_official_rule_verified');
  });

  it('returns missing for an institution with no source target and no calculator config', () => {
    const unmappedInstitutionId = 'unmapped_institution' as CatalogueInstitution['id'];
    const program = makeProgram({
      linkedInstitutionIds: [unmappedInstitutionId],
    });

    const unmappedInstitution: CatalogueInstitution = {
      id: unmappedInstitutionId,
      name: 'Unmapped Institution',
      region: 'center',
      domain: 'unmapped.example',
      universityId: unmappedInstitutionId,
    };

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: [...INSTITUTIONS, unmappedInstitution],
    });

    const entry = entries.find((e) => e.institutionId === unmappedInstitutionId);
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

  it('returns open_admission for a requirements program with a structured open-admission fact', () => {
    const program = makeProgram({
      linkedInstitutionIds: ['open_fact' as any],
      institutionDetails: [
        {
          institutionName: 'Open Fact College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'open_fact_program:open_fact:fact:open',
              kind: 'open_admission',
              field: 'open_admission',
              comparison: 'eq',
              valueNumber: null,
              valueText: 'קבלה פתוחה',
              unit: 'boolean',
              description: 'קבלה פתוחה ללא תנאי סף',
              confidence: 'high',
              isRequired: false,
            },
          ],
        },
      ],
    });

    const openFactInstitution: CatalogueInstitution = {
      id: 'open_fact' as any,
      name: 'Open Fact College',
      region: 'center',
      domain: 'openfact.example',
      universityId: 'open_fact' as any,
    };

    const entries = buildAdmissionsCapabilityMatrix({
      program,
      institutions: [...INSTITUTIONS, openFactInstitution],
    });

    const entry = entries.find((e) => e.institutionId === ('open_fact' as any));
    expect(entry?.capability).toBe('open_admission');
  });

  it('withdraws the verified TAU pair when source freshness is blocked', () => {
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

  it('withdraws the verified TAU pair when source freshness failed', () => {
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
