import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';
import qaReplay from '../../docs/admissions-verification/evidence/2026-10-29-haifa-qa-replay.json';
import braudeCsFixture from './__fixtures__/braudeCsCatalogue.json';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import { catalogueAdmissionRequirements } from './catalogueDisplayText';
import { describe, expect, it, vi } from 'vitest';
import {
  toggleLocation,
  bagrutScoresForMode,
  resultLabel,
  resultExplanation,
  showsOfficialNoCalculationNote,
  groupJourneyRows,
  studyFields,
  matchesStudyField,
  selectedStudyFieldIds,
  journeyRows,
  distinctRecommendations,
} from './studyJourney';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from './catalogueStatic';
import { evaluateBatchBManualPath } from '@/server/admissions/batchBManualPathEvaluation';
import { PROGRAM_CANONICAL_ALIASES } from './seo/programAliases';
import type {
  AdmissionsEvaluationInput as AdmissionsEvaluationRequest,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';

vi.mock('server-only', () => ({}));

it('never labels TAU architecture "אפשר להגיש מועמדות" when a floor fails', async () => {
  const program = {
    ...getStaticCataloguePrograms().find((row) => row.id === 'architecture')!,
    linkedInstitutionIds: ['tau'],
  };
  for (const [psychometric, bagrut, english] of [
    [680, 110, 90],
    [500, 110, 110],
    [680, 110, 110],
  ] as const) {
    const evaluation = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      input: {
        degreeId: 'architecture',
        psychometric,
        bagrut,
        extraInputs: { psychometricEnglish: english, mathUnits: 5, mathGrade: 70 },
      },
      freshnessStatesBySourceId: new Map(),
      fetcher: vi.fn<typeof fetch>(),
    });
    const result = evaluation.results[0];
    expect(result.linkedInstitutionId).toBe('tau');
    const { label } = resultLabel(result, false, false, 'architecture');
    if (english < 100 || psychometric < 551) {
      expect(result.decision).toBe('below');
      expect(label).not.toBe('אפשר להגיש מועמדות');
      expect(label).toBe('לא עומד/ת בתנאי הסף');
    } else {
      expect(result.decision).toBe('unknown');
      expect(result.floorChecks).toHaveLength(3);
      expect(result.floorChecks!.every((floor) => floor.status === 'pass')).toBe(true);
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 9)
      expect(label).toBe('השלב הבא: מיון במוסד');
    }
  }
});

it.each([
  ['maths', 'מתמטיקה', { psychometricEnglish: 110 }],
  ['English', 'אנגלית בפסיכומטרי', { mathUnits: 5, mathGrade: 70 }],
] as const)(
  'never labels TAU architecture "אפשר להגיש מועמדות" when %s is missing',
  async (_missingInput, floorLabel, extraInputs) => {
    const program = {
      ...getStaticCataloguePrograms().find((row) => row.id === 'architecture')!,
      linkedInstitutionIds: ['tau'],
    };
    const evaluation = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      input: {
        degreeId: 'architecture',
        psychometric: 680,
        bagrut: 110,
        extraInputs,
      },
      freshnessStatesBySourceId: new Map(),
      fetcher: vi.fn<typeof fetch>(),
    });
    const result = evaluation.results[0];
    expect(result.linkedInstitutionId).toBe('tau');
    expect(result.kind).toBe('manual_gate');
    expect(result.decision).toBe('unknown');
    expect(result.floorChecks?.find((floor) => floor.label === floorLabel)?.status).toBe('missing');
    const { label } = resultLabel(result, false, false, 'architecture');
    expect(label).not.toBe('אפשר להגיש מועמדות');
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 9)
    expect(label).toBe('השלב הבא: מיון במוסד');
  },
);

it.each(['exact', 'estimated'] as const)(
  'preserves other programmes no-verdict status for kind %s',
  (kind) => {
    const result: AdmissionsEvaluationResult = {
      institution: getStaticCatalogueInstitutions().find((i) => i.id === 'haifa')!,
      linkedInstitutionId: 'haifa',
      kind,
      capability: kind,
      decision: 'pending',
      confidence: 'medium',
      score: 520,
      sourceLabel: 'תנאי קבלה',
      explanation: 'בטווח המתנה',
      nextAction: 'בדקו באתר המוסד',
    };
    expect(resultLabel(result, false, false, 'haifa_sociology')).toEqual({
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 7)
      label: 'הסכם שלכם: 520',
      group: 'explore',
    });
    expect(
      resultLabel({ ...result, linkedInstitutionId: 'technion' }, false, false, 'technion_cs'),
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 7)
    ).toEqual({ label: 'הסכם שלכם: 520', group: 'explore' });
    expect(resultLabel(result, false, false, 'technion_medicine')).toEqual({
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 7)
      label: 'הסכם שלכם: 520',
      group: 'explore',
    });
  },
);

describe('subject search synonyms', () => {
  it.each(['הנדסה', 'הנדסת', '  הנדסה  '])('matches engineering forms for %s', (query) => {
    for (const name of ['הנדסת תוכנה', 'הנדסה אזרחית', 'הנדסה וטכנולוגיה', 'הנדסת חלל']) {
      expect(matchesStudyField({ name }, query)).toBe(true);
    }
    expect(matchesStudyField({ name: 'מדעי המחשב' }, query)).toBe(false);
  });

  it('preserves specific and unrelated subject searches', () => {
    expect(matchesStudyField({ name: 'הנדסת חשמל' }, 'הנדסה חשמל')).toBe(true);
    expect(matchesStudyField({ name: 'הנדסת מכונות' }, 'הנדסה חשמל')).toBe(false);
    expect(matchesStudyField({ name: 'מדעי המחשב' }, 'מדעי   המחשב')).toBe(true);
    expect(matchesStudyField({ name: 'משפטים' }, 'משפט')).toBe(true);
  });
});

describe('engineering search without catalogue hub rows', () => {
  // The live catalogue has individual engineering programmes, with no row
  // named "הנדסה וטכנולוגיה". The static catalogue also has broad hub rows.
  const programs = getStaticCataloguePrograms().filter(
    (program) =>
      program.institutionId &&
      program.isListed !== false &&
      program.type === 'academic' &&
      ((/הנדס[הת]/.test(program.name) && !program.name.startsWith('הנדסה וטכנולוגיה')) ||
        program.id === 'tau_cs'),
  );

  it.each(['הנדסה', 'הנדסת'])(
    'returns the hub and individual engineering chips for %s',
    (query) => {
      expect(programs.some((program) => program.name.startsWith('הנדסה וטכנולוגיה'))).toBe(false);
      const names = studyFields(programs)
        .filter((field) => matchesStudyField(field, query))
        .map((field) => field.name);

      expect(names).toContain('הנדסה וטכנולוגיה');
      expect(names).toEqual(
        expect.arrayContaining([
          'הנדסה אזרחית',
          'הנדסה ביורפואית',
          'הנדסה כימית',
          'הנדסת חשמל',
          'הנדסת מכונות',
          'הנדסת קול וסאונד',
          'הנדסת תוכנה',
          'הנדסת תעשייה וניהול',
        ]),
      );
      expect(names).not.toContain('מדעי המחשב');
    },
  );

  it('selects the family members without duplicating programmes or including unrelated subjects', () => {
    const fields = studyFields(programs);
    const hub = fields.find((field) => field.name === 'הנדסה וטכנולוגיה')!;
    const ids = selectedStudyFieldIds(fields, [hub.id]);
    const rows = journeyRows(fields, getStaticCatalogueInstitutions());
    const selected = rows.filter((row) => ids.includes(row.fieldId));

    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((row) => /הנדס[הת]/.test(row.fieldName))).toBe(true);
    expect(selected.some((row) => row.program.id === 'afeka_softwareeng')).toBe(true);
    expect(selected.some((row) => row.program.id === 'tau_cs')).toBe(false);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(selectedStudyFieldIds(fields, [hub.id, 'ee']).filter((id) => id === 'ee')).toHaveLength(
      1,
    );
  });

  it('keeps a single hub when the catalogue already contains hub programmes', () => {
    const fields = studyFields(getStaticCataloguePrograms());
    expect(fields.filter((field) => field.name === 'הנדסה וטכנולוגיה')).toHaveLength(1);
    expect(
      fields.find((field) => field.name === 'הנדסה וטכנולוגיה')!.programs.length,
    ).toBeGreaterThan(0);
  });

  it('does not create an empty engineering family for an unrelated catalogue', () => {
    const cs = programs.find((program) => program.id === 'tau_cs')!;
    expect(studyFields([cs]).map((field) => field.name)).toEqual(['מדעי המחשב']);
  });
});

describe('approved journey', () => {
  it.each([
    'tlvyaffo_cs',
    'tlvyaffo_nursing',
    'tlvyaffo_business',
    'colmgmt_law',
    'colmgmt_business',
    'colman_law',
    'colman_business',
    'colmgmt_economics',
    'colmgmt_cs',
  ])('preserves program-specific route explanations for %s', (programId) => {
    const result = {
      institution: getStaticCatalogueInstitutions()[0],
      linkedInstitutionId: programId.startsWith('tlvyaffo_') ? 'mta' : 'colman',
      capability: 'manual_gate' as const,
      kind: 'manual_gate' as const,
      decision: 'unknown' as const,
      confidence: 'high' as const,
      sourceLabel: 'תנאי קבלה',
      nextAction: 'בדקו מול מרכז הרישום',
      explanation: 'במסלול בגרות ופסיכומטרי ההחלטה היא של המכללה.',
    };
    expect(resultExplanation(result, programId)).toBe(result.explanation);
    expect(resultExplanation(result, 'colmgmt_accounting')).not.toBe(result.explanation);
  });
  it.each([
    ['bezalel_industrial_design', 'bezalel'],
    ['shenkar_fashion', 'shenkar'],
    ['samspiegel_cinema', 'spieldocs'],
    ['telhai_nursing', 'telhai'],
    ['ono_nursing', 'ono'],
  ] as const)('preserves Batch B manual-gate explanation for %s', (programId, institutionId) => {
    const result = {
      institution: getStaticCatalogueInstitutions()[0],
      linkedInstitutionId: institutionId,
      capability: 'manual_gate' as const,
      kind: 'manual_gate' as const,
      decision: 'eligible_to_apply' as const,
      confidence: 'medium' as const,
      sourceLabel: 'נדרש מיון נוסף',
      nextAction: 'הגישו מועמדות',
      explanation: 'במסלול הזה לא מספיקים ציוני בגרות או פסיכומטרי לבדם.',
    };
    expect(resultExplanation(result, programId)).toBe(result.explanation);
  });
  it('gives accepted manual score passes priority over the score-assessment label', () => {
    const result = evaluateBatchBManualPath({
      input: { degreeId: 'ono_nursing', bagrut: 85, psychometric: 520 },
      institution: getStaticCatalogueInstitutions().find((i) => i.id === 'ono')!,
    })!;
    expect(resultLabel(result)).toEqual({ label: 'מתקבלים', group: 'match' });
    expect(resultExplanation(result, 'ono_nursing')).toBe(result.explanation);
    expect(resultLabel({ ...result, decision: 'pending' })).toEqual({
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 1)
      label: 'עוברים את הסף ✓',
      group: 'match',
    });
    expect(
      resultLabel({ ...result, decision: 'below', scoreAssessment: 'below_threshold' }),
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 2)
    ).toEqual({ label: 'עוד לא בסף', group: 'improve' });
    expect(
      resultLabel({ ...result, decision: 'eligible_to_apply', scoreAssessment: undefined }),
    ).toEqual({ label: 'אפשר להגיש מועמדות', group: 'match' });
  });

  it('keeps Afeka software engineering in its own field, not Computer Science', () => {
    const fields = studyFields(getStaticCataloguePrograms());
    expect(
      fields
        .find((field) => field.id === 'cs')
        ?.programs.some((program) => program.id === 'afeka_softwareeng'),
    ).toBe(false);
    expect(
      fields.find((field) => field.programs.some((program) => program.id === 'afeka_softwareeng'))
        ?.name,
    ).toBe('הנדסת תוכנה');
  });
  it.each(Object.entries(PROGRAM_CANONICAL_ALIASES))(
    'shows one recommendation for %s while keeping its saved row available',
    (alias, canonical) => {
      const template = getStaticCataloguePrograms().find(
        (program) => program.id === canonical || program.id === alias,
      )!;
      const programmes = [
        { ...template, id: canonical },
        { ...template, id: alias },
      ];
      const rows = journeyRows(studyFields(programmes), getStaticCatalogueInstitutions());
      expect(rows.map((row) => row.program.id)).toContain(alias);
      expect(distinctRecommendations(rows).map((row) => row.program.id)).toEqual([canonical]);
      expect(distinctRecommendations(rows.filter((row) => row.program.id === alias))).toHaveLength(
        1,
      );
      expect(distinctRecommendations([...rows].reverse()).map((row) => row.program.id)).toEqual([
        canonical,
      ]);
      const otherInstitution = {
        ...rows.find((row) => row.program.id === canonical)!,
        institution: getStaticCatalogueInstitutions().find(
          (institution) => institution.id !== template.institutionId,
        )!,
      };
      expect(
        distinctRecommendations([
          ...rows.filter((row) => row.program.id === alias),
          otherInstitution,
        ]),
      ).toHaveLength(2);
    },
  );
  it('excludes withdrawn import placeholders from choices while retaining saved references', () => {
    const program = { ...getStaticCataloguePrograms()[0], isListed: false };
    expect(studyFields([program])).toEqual([]);
    expect(studyFields([program], true).flatMap((field) => field.programs)).toContain(program);
  });
  it('uses corrected catalogue classification even when a legacy ID ends in cs', () => {
    const catalogue = getStaticCataloguePrograms();
    const culinary = catalogue.find((program) => program.id === 'danon_culinary')!;
    const corrected = { ...culinary, id: 'danon_cs' };
    const fields = studyFields([...catalogue, corrected]);
    expect(
      fields
        .find((field) => field.id === 'cs')
        ?.programs.some((program) => program.institutionId === 'danon'),
    ).toBe(false);
    expect(fields.find((field) => field.programs.includes(corrected))?.name).toBe('קולינריה');
  });
  it('keeps International independent of All Israel and domestic areas', () => {
    expect(toggleLocation(['all'], 'online')).toEqual(['all', 'online']);
    expect(toggleLocation(['all', 'online'], 'north')).toEqual(['online', 'north']);
    expect(toggleLocation(['online', 'north'], 'all')).toEqual(['online', 'all']);
    expect(toggleLocation(['all', 'online'], 'online')).toEqual(['all']);
  });
  it('does not turn unavailable admissions data into an acceptance', () => {
    expect(resultLabel(undefined).group).toBe('explore');
    expect(resultLabel(undefined).label).toBe('טרם חושבה התאמה');
    expect(resultLabel(undefined, true).label).toBe('החישוב לא נטען');
    expect(resultLabel(undefined, false, true).label).toBe('החישוב מתבצע…');
  });
  it('keeps incomplete official conditions in exploration without asking for more grades', () => {
    const result = {
      institution: getStaticCatalogueInstitutions()[0],
      linkedInstitutionId: 'test',
      capability: 'requirements_only' as const,
      kind: 'requirements_only' as const,
      decision: 'unknown' as const,
      confidence: 'low' as const,
      sourceLabel: 'תנאי קבלה',
      explanation: 'תנאי הקבלה המלאים אינם מפורסמים באתר המוסד, ולכן עדיין אי אפשר לקבוע התאמה.',
      nextAction: 'בררו את תנאי הקבלה עם המוסד לפני ההרשמה.',
      degradationReason: 'incomplete_published_requirements',
    };
    expect(resultLabel(result)).toEqual({ label: 'עדיין לא ניתן לקבוע התאמה', group: 'explore' });
    expect(resultExplanation(result)).toBeUndefined();
  });
  it('groups degree results without hiding their contact rows', () => {
    expect(groupJourneyRows([], 'field')).toEqual([]);
  });
});

it('QA block 1: mon_12220708942_cs result detail retains published CS conditions after alias mapping', () => {
  const program = structuredClone(braudeCsFixture.program) as CatalogueProgram;
  const institutions = braudeCsFixture.institutions as CatalogueInstitution[];
  const row = journeyRows(studyFields([program]), institutions).find(
    (candidate) => candidate.program.id === 'mon_12220708942_cs',
  )!;
  expect(row).toBeDefined();
  // StudyJourney selects its active result detail by the displayed institution name.
  const detail = row.program.institutionDetails?.find(
    (candidate) => candidate.institutionName === row.institution.name,
  );
  const requirements = catalogueAdmissionRequirements(
    detail?.specificAdmissionNotes,
    row.program.admissionRequirements,
    row.program.id,
  );
  expect(requirements).toEqual(
    braudeCsFixture.program.institutionDetails[0].specificAdmissionNotes,
  );
  for (const floor of ['75', '600', '115', '580']) expect(requirements.join(' ')).toContain(floor);
  expect(detail?.programUrl).toBe('https://w3.braude.ac.il/intrested/');
  expect(program).toEqual(braudeCsFixture.program);
});

describe('H1 showsOfficialNoCalculationNote', () => {
  it.each(['tracked_missing_rule', 'authority_unavailable'] as const)(
    'recognizes the Haifa note with official sources for %s only',
    (kind) => {
      const result = {
        ...qaReplay.h1.result,
        kind,
        capability: kind,
      } as AdmissionsEvaluationResult;
      expect(showsOfficialNoCalculationNote(result)).toBe(true);
      for (const explanation of [
        'המיפוי של מסלול מערכות המידע החד־חוגי הרגיל למחשבון הרשמי טרם אומת. לא ניתן לקבוע זכאות עבורו.',
        'סף המחשבון אינו תואם את הסף שפורסם למסלול.',
      ]) {
        expect(showsOfficialNoCalculationNote({ ...result, explanation })).toBe(false);
      }
      expect(
        showsOfficialNoCalculationNote({
          ...qaReplay.h1.bgu.result,
          kind,
          capability: kind,
        } as AdmissionsEvaluationResult),
      ).toBe(false);
      expect(showsOfficialNoCalculationNote({ ...result, officialUrls: [] })).toBe(false);
      expect(showsOfficialNoCalculationNote({ ...result, officialUrls: undefined })).toBe(false);
    },
  );

  it.each([
    'exact',
    'estimated',
    'needs_input',
    'manual_gate',
    'requirements_only',
    'unsupported',
    'degraded',
    'open_admission',
  ] as const)('does not hide the chip for %s even with the note and official sources', (kind) => {
    expect(
      showsOfficialNoCalculationNote({ ...qaReplay.h1.result, kind } as AdmissionsEvaluationResult),
    ).toBe(false);
  });

  it('does not hide the chip before a result is available', () => {
    expect(showsOfficialNoCalculationNote(undefined)).toBe(false);
  });
});

// H1: keep the real captured API explanation instead of substituting generic copy.
it.each(['tracked_missing_rule', 'authority_unavailable'] as const)(
  'H1 preserves the API explanation for %s at both institutions',
  (kind) => {
    for (const captured of [qaReplay.h1.result, qaReplay.h1.bgu.result]) {
      expect(
        resultExplanation({ ...captured, kind, capability: kind } as AdmissionsEvaluationResult),
      ).toBe(captured.explanation);
    }
  },
);

it.each([
  ['medicine', 'tau', 'authority_unavailable'],
  ['tau_medicine', 'tau', 'authority_unavailable'],
  ['physiotherapy', 'tau', 'authority_unavailable'],
  ['colmgmt_cs', 'colman', 'authority_unavailable'],
  ['colmgmt_cs', 'colman', 'tracked_missing_rule'],
] as const)(
  'H1 Latin ledger fallback for %s at %s (%s)',
  async (programId, institutionId, kind) => {
    const program = getStaticCataloguePrograms().find((p) => p.id === programId)!;
    const institution = getStaticCatalogueInstitutions().find((i) => i.id === institutionId)!;
    const evaluation = await evaluateAdmissionsForProgram({
      program: { ...program, linkedInstitutionIds: [institutionId] },
      institutions: [institution],
      input: {
        ...qaReplay.h1.request,
        degreeId: programId,
      } as unknown as AdmissionsEvaluationRequest,
      freshnessStatesBySourceId: new Map(),
      fetcher: vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('No live requests in H1 regression')),
      now: new Date('2026-10-29T00:00:00Z'),
    });
    // The named routes currently hit earlier Hebrew requirements/policy gates.
    // Retain the evaluator's result shape and real links; replay the existing English
    // ledger note as an unavailable API result, without inventing prose or live evidence.
    const apiResult: AdmissionsEvaluationResult = {
      ...evaluation.results[0],
      kind,
      capability: kind,
      degradationReason: undefined,
      officialUrls: evaluation.results[0].officialUrls ?? [
        FORMULA_BACKED_VERIFICATION_LEDGER.find(
          (row) => row.pairId === `${programId}__${institutionId}`,
        )!.sourceUrl,
      ],
      explanation: FORMULA_BACKED_VERIFICATION_LEDGER.find(
        (row) => row.pairId === `${programId}__${institutionId}`,
      )!.reason,
    };
    expect(apiResult.kind).toBe(kind);
    expect(apiResult.explanation).toMatch(/[a-zA-Z]/);
    expect(apiResult.officialUrls?.length).toBeGreaterThan(0);
    const generic =
      kind === 'authority_unavailable'
        ? 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.'
        : // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 6)
          'תנאי הקבלה כאן למטה. רוצים תשובה אישית? השאירו פרטים והמוסד יחזור אליכם.';

    expect(resultExplanation(apiResult, programId)).toBe(generic);
  },
);

describe('bagrutScoresForMode', () => {
  const subjectRecord = {
    schemaVersion: 1 as const,
    sector: 'jewish' as const,
    subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
  };
  const scores = {
    bagrut: { weightedAverage: 110, subjectRecord },
    psychometric: { overall: 650 },
  };
  it.each(['quick', 'exact', 'none'] as const)(
    'aligns a stale profile marker with the newly submitted %s projection',
    (mode) => {
      const saved = { ...scores, admissions: { activeBagrutPath: 'quick' as const } };
      const result = bagrutScoresForMode(saved, mode);
      expect(result.admissions?.activeBagrutPath).toBe(mode);
      expect(result.bagrut).toEqual(
        mode === 'quick'
          ? { weightedAverage: 110 }
          : mode === 'exact'
            ? { subjectRecord }
            : undefined,
      );
      expect(saved.admissions.activeBagrutPath).toBe('quick');
    },
  );
  it.each(['quick', 'exact', 'none'] as const)(
    'selects only the %s path without mutating scores',
    (mode) => {
      const result = bagrutScoresForMode(scores, mode);
      expect(result.bagrut).toEqual(
        mode === 'quick'
          ? { weightedAverage: 110 }
          : mode === 'exact'
            ? { subjectRecord }
            : undefined,
      );
      expect(result.psychometric).toBe(scores.psychometric);
      expect(scores.bagrut).toEqual({ weightedAverage: 110, subjectRecord });
    },
  );
  it('preserves legacy scores with no chosen mode and tolerates missing bagrut', () => {
    expect(bagrutScoresForMode(scores, undefined)).toBe(scores);
    expect(bagrutScoresForMode({}, 'exact').bagrut).toBeUndefined();
    expect(bagrutScoresForMode({}, 'quick').bagrut).toBeUndefined();
  });
});
