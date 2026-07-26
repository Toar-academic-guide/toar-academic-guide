import 'server-only';

import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import type { University } from '@/types';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { SourceFreshnessStateRow } from '@/db/types';
import { admissionsInputValue } from './admissionsInputValue';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import {
  buildAdmissionsCapabilityMatrix,
  loadFreshnessStatesBySourceIds,
  type AdmissionsCapabilityEntry,
} from './capabilityMatrix';
import { runHaifaAdmissionsProof } from '@/server/ingestion/adapters/haifaAdmissions';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';
import { runHujiAdmissionsProof } from '@/server/ingestion/adapters/hujiAdmissions';
import { runTechnionAdmissionsProof } from '@/server/ingestion/adapters/technionAdmissions';
import { runBguAdmissionsProof } from '@/server/ingestion/adapters/bguAdmissions';
import {
  getMondayAdmissionEvidenceByCatalogueInstitutionId,
  type MondayAdmissionEvidenceRecord,
} from '@/data/admissions/mondayEvidence';
import {
  ADMISSIONS_EVALUATOR_VERSION,
  createAdmissionsInputDigest,
  createAdmissionsEvaluationSnapshot,
} from './evaluationSnapshot';
import { evaluateTauDigitalSciencesGates } from './tauDigitalSciencesPolicy';
import { evaluateTauNursingGates } from './tauNursingPolicy';
import { evaluateTauPsychologyGates, TAU_PSYCHOLOGY_REQUIREMENTS_URL } from './tauPsychologyPolicy';
import { evaluateTauLawGates, TAU_LAW_REQUIREMENTS_URL } from './tauLawPolicy';

const MAX_EXACT_SOURCE_CALLS = 2;
const OFFICIAL_SOURCE_TIMEOUT_MS = 5000;

export async function evaluateAdmissionsForProgram(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  fetcher?: typeof fetch;
  now?: Date;
  freshnessStatesBySourceId?: Map<string, SourceFreshnessStateRow>;
}): Promise<AdmissionsEvaluationReport> {
  const {
    input,
    program,
    institutions,
    fetcher,
    now = new Date(),
    freshnessStatesBySourceId: suppliedFreshnessStates,
  } = args;

  const exactSourceIds = program.linkedInstitutionIds
    .map((institutionId) => `${program.id}__${institutionId}`)
    .flatMap((key) => {
      if (key === 'haifa_cs__haifa') return ['haifa-cs-live'];
      if (key === 'tau_datascience__tau') return ['tau-digital-sciences-live'];
      if (key === 'nursing__tau') return ['tau-nursing-live'];
      if (key === 'tau_psychology__tau') return ['tau-psychology-live'];
      if (key === 'law__tau') return ['tau-law-live'];
      if (key === 'tau_law__tau') return ['tau-law-legacy-live'];
      if (key === 'accounting__tau') return ['tau-accounting-live'];
      if (key === 'tau_accounting__tau') return ['tau-accounting-legacy-live'];
      if (key === 'architecture__tau') return ['tau-architecture-live'];
      if (key === 'biology__tau') return ['tau-biology-live'];
      if (key === 'communication__tau') return ['tau-communication-live'];
      if (key === 'political_science__tau') return ['tau-political-science-live'];
      if (key === 'education__tau') return ['tau-education-live'];
      if (key === 'economics__tau') return ['tau-economics-live'];
      if (key === 'tau_economics__tau') return ['tau-economics-legacy-live'];
      if (key === 'cs__tau') return ['tau-cs-live'];
      if (key === 'tau_cs__tau') return ['tau-cs-legacy-live'];
      if (key === 'ee__tau') return ['tau-ee-live'];
      if (key === 'tau_ee__tau') return ['tau-ee-legacy-live'];
      if (key === 'me__tau') return ['tau-me-live'];
      if (key === 'tau_me__tau') return ['tau-me-legacy-live'];
      if (key === 'occupational_therapy__tau') return ['tau-occupational-live'];
      if (key === 'tau_occupational_therapy__tau') return ['tau-occupational-legacy-live'];
      if (key === 'tau_industrial__tau') return ['tau-industrial-live'];
      if (key === 'tau_biology__tau') return ['tau-biology-legacy-live'];
      return [];
    });

  const freshnessStatesBySourceId =
    suppliedFreshnessStates ?? (await loadFreshnessStatesBySourceIds(exactSourceIds));
  const capabilityEntries = buildAdmissionsCapabilityMatrix({
    program,
    institutions,
    input: input.extraInputs,
    freshnessStatesBySourceId,
    now,
  });

  const results = await evaluateCapabilityEntries({
    input,
    program,
    institutions,
    capabilityEntries,
    fetcher,
  });

  const versionedResults = results.map((result) => ({
    ...result,
    snapshot: createAdmissionsEvaluationSnapshot({ input, result }),
  }));

  return {
    generatedAt: now.toISOString(),
    evaluatorVersion: ADMISSIONS_EVALUATOR_VERSION,
    inputDigest: createAdmissionsInputDigest(input),
    input,
    program: {
      id: program.id,
      name: program.name,
    },
    results: versionedResults,
  };
}

async function evaluateCapabilityEntries(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  capabilityEntries: AdmissionsCapabilityEntry[];
  fetcher?: typeof fetch;
}): Promise<AdmissionsEvaluationResult[]> {
  const { input, program, institutions, capabilityEntries, fetcher } = args;
  let exactCallCount = 0;

  const results: AdmissionsEvaluationResult[] = [];

  for (const entry of capabilityEntries) {
    const institution = institutions.find((item) => item.id === entry.institutionId);
    if (!institution) {
      continue;
    }

    if (
      entry.capability === 'exact' &&
      entry.exactTarget &&
      exactCallCount < MAX_EXACT_SOURCE_CALLS
    ) {
      exactCallCount += 1;
      results.push(
        await evaluateExactResult({
          input,
          program,
          institution,
          exactTarget: entry.exactTarget,
          fetcher,
        }),
      );
      continue;
    }

    results.push(
      evaluateNonExactResult({
        input,
        program,
        institution,
        entry,
        exactCallsBounded: exactCallCount >= MAX_EXACT_SOURCE_CALLS,
      }),
    );
  }

  return results;
}

async function evaluateExactResult(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  exactTarget: NonNullable<AdmissionsCapabilityEntry['exactTarget']>;
  fetcher?: typeof fetch;
}): Promise<AdmissionsEvaluationResult> {
  const { input, program, institution, exactTarget, fetcher } = args;

  const timedFetcher = withTimeout(fetcher ?? fetch, OFFICIAL_SOURCE_TIMEOUT_MS);

  try {
    if (exactTarget.sourceTarget.adapterId === 'haifa') {
      const proof = await runHaifaAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
          psychometricSubscores: {
            english: input.extraInputs?.psychometricEnglish ?? 0,
            math: input.extraInputs?.psychometricMath ?? 0,
            verbal: input.extraInputs?.psychometricVerbal ?? 0,
          },
        },
      });

      return applyStructuredRequirementsToAcceptedScoreResult({
        input,
        program,
        institution,
        baseResult: normalizeExactProofResult({
          institution,
          proof: proof.normalizedPayload,
          explanationPrefix: 'מקור רשמי של אוניברסיטת חיפה',
        }),
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'technion') {
      const proof = await runTechnionAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return applyStructuredRequirementsToAcceptedScoreResult({
        input,
        program,
        institution,
        baseResult: normalizeExactProofResult({
          institution,
          proof: proof.normalizedPayload,
          explanationPrefix: 'מקור רשמי של הטכניון',
        }),
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'bgu') {
      const proof = await runBguAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return applyStructuredRequirementsToAcceptedScoreResult({
        input,
        program,
        institution,
        baseResult: normalizeExactProofResult({
          institution,
          proof: proof.normalizedPayload,
          explanationPrefix: 'מקור רשמי של אוניברסיטת בן-גוריון',
        }),
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'huji') {
      const proof = await runHujiAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של האוניברסיטה העברית',
      });
    }

    if (
      exactTarget.targetId === 'tau-medicine-live' ||
      exactTarget.targetId === 'tau-medicine-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const mathUnits = input.extraInputs?.mathUnits;
      const mathGrade = input.extraInputs?.mathGrade;
      if (
        typeof psychometricEnglish !== 'number' ||
        typeof mathUnits !== 'number' ||
        typeof mathGrade !== 'number'
      ) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(typeof mathUnits !== 'number' ? ['math_units' as const] : []),
          ...(typeof mathGrade !== 'number' ? ['math_grade' as const] : []),
        ]);
      }
      if (input.psychometric < 700 || psychometricEnglish < 120 || mathUnits < 4) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: [
            ...(input.psychometric < 700 ? ['פסיכומטרי 700 ומעלה'] : []),
            ...(psychometricEnglish < 120 ? ['אנגלית בפסיכומטרי ברמת 120 ומעלה'] : []),
            ...(mathUnits < 4 ? ['מתמטיקה ברמת 4 יחידות ומעלה'] : []),
          ],
          requirementsUrl: 'https://go.tau.ac.il/he/med/ba/med-doc?v=important-info',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
        positiveDecision: 'eligible_to_apply',
      });
    }

    if (exactTarget.targetId === 'tau-physiotherapy-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl: 'https://go.tau.ac.il/he/med/ba/phys?v=important-info',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
        positiveDecision: 'eligible_to_apply',
      });
    }

    if (exactTarget.targetId === 'tau-nursing-live') {
      const gateResult = evaluateTauNursingGates(input);
      if (gateResult.state === 'needs_input') {
        return requiredInputsResult(institution, gateResult.requiredInputs);
      }
      if (gateResult.state === 'below') {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gateResult.unmetRequirements,
          requirementsUrl: 'https://go.tau.ac.il/he/med/ba/nursing?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
        positiveDecision: 'eligible_to_apply',
      });
    }

    if (
      exactTarget.targetId === 'tau-psychology-live' ||
      exactTarget.targetId === 'tau-psychology-legacy-live'
    ) {
      const gateResult = evaluateTauPsychologyGates(input);
      if (gateResult.state === 'needs_input') {
        return requiredInputsResult(institution, gateResult.requiredInputs);
      }
      if (gateResult.state === 'below') {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gateResult.unmetRequirements,
          requirementsUrl: TAU_PSYCHOLOGY_REQUIREMENTS_URL,
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-social-work-live' ||
      exactTarget.targetId === 'tau-social-work-legacy-live'
    ) {
      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-law-live' || exactTarget.targetId === 'tau-law-legacy-live') {
      const gateResult = evaluateTauLawGates(input);
      if (gateResult.state === 'needs_input') {
        return requiredInputsResult(institution, gateResult.requiredInputs);
      }
      if (gateResult.state === 'below') {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gateResult.unmetRequirements,
          requirementsUrl: TAU_LAW_REQUIREMENTS_URL,
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-accounting-live' ||
      exactTarget.targetId === 'tau-accounting-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/management/ba/accounting?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-architecture-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/architecture?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-biology-live' ||
      exactTarget.targetId === 'tau-biology-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/life-sciences/ba/biology?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-communication-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/social-sciences/ba/communication?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-political-science-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/social-sciences/ba/political-science?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-education-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/social-sciences/ba/education?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-economics-live' ||
      exactTarget.targetId === 'tau-economics-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/management/ba/economics?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-cs-live' || exactTarget.targetId === 'tau-cs-legacy-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/computer-science?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-ee-live' || exactTarget.targetId === 'tau-ee-legacy-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/electrical-engineering?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-me-live' || exactTarget.targetId === 'tau-me-legacy-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/mechanical-engineering?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-occupational-live' ||
      exactTarget.targetId === 'tau-occupational-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/med/ba/occupational-therapy?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-industrial-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/industrial-engineering?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    const gateResult = evaluateTauDigitalSciencesGates(input);
    if (gateResult.state === 'needs_input') {
      return requiredInputsResult(institution, gateResult.requiredInputs);
    }
    if (gateResult.state === 'below') {
      return exactGateFailureResult({
        institution,
        unmetRequirements: gateResult.unmetRequirements,
        requirementsUrl:
          'https://go.tau.ac.il/he/engineering/ba/high-tech-plus?v=admission-requirements',
      });
    }

    const proof = await runTauAdmissionsProof({
      fetcher: timedFetcher,
      program: exactTarget.program,
      applicant: {
        bagrutAverage: input.bagrut,
        psychometric: input.psychometric,
        exactSciencesBonusEligible: gateResult.exactSciencesBonusEligible,
      },
    });

    return applyStructuredRequirementsToAcceptedScoreResult({
      input,
      program,
      institution,
      baseResult: normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      }),
    });
  } catch (error) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'stale',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי לא זמין',
      explanation:
        error instanceof Error
          ? `לא הצלחנו לקבל אימות רשמי כרגע: ${error.message}`
          : 'לא הצלחנו לקבל אימות רשמי כרגע.',
      nextAction: institution.calculatorUrl
        ? 'נסו שוב מאוחר יותר או בדקו ישירות במחשבון הרשמי.'
        : 'נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_unavailable',
    };
  }
}

function normalizeExactProofResult(args: {
  institution: CatalogueInstitution;
  proof: Record<string, unknown>;
  explanationPrefix: string;
  positiveDecision?: 'accepted' | 'eligible_to_apply';
}): AdmissionsEvaluationResult {
  const { institution, proof, explanationPrefix } = args;
  const positiveDecision =
    args.positiveDecision ??
    (proof.officialVerdict === 'eligible_to_apply' ? 'eligible_to_apply' : 'accepted');

  const score = numberOrUndefined(proof.selectedScore) ?? numberOrUndefined(proof.weightedScore);
  const threshold =
    numberOrUndefined(proof.acceptanceThreshold) ?? numberOrUndefined(proof.acceptanceCutoff);

  if (score === undefined || threshold === undefined) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'unsupported',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי חלקי',
      explanation: `${explanationPrefix} החזיר נתונים חלקיים ללא סף קבלה מאומת.`,
      nextAction: 'בדקו ישירות במקור הרשמי או נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_partial',
    };
  }

  const officialVerdict =
    proof.officialVerdict === 'accepted' ||
    proof.officialVerdict === 'below' ||
    proof.officialVerdict === 'eligible_to_apply' ||
    proof.officialVerdict === 'pending'
      ? proof.officialVerdict
      : undefined;
  const decision =
    officialVerdict === 'accepted' || officialVerdict === 'eligible_to_apply'
      ? positiveDecision
      : officialVerdict === 'below'
        ? 'below'
        : officialVerdict === 'pending'
          ? 'unknown'
          : score >= threshold
            ? 'accepted'
            : 'below';
  const scoreLabel = proof.selectedScore !== undefined ? 'ציון התאמה' : 'ציון משוקלל';

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'exact',
    kind: decision === 'eligible_to_apply' ? 'manual_gate' : 'exact',
    decision,
    confidence: 'high',
    sourceLabel:
      decision === 'eligible_to_apply'
        ? 'כשירות להמשך מיון'
        : officialVerdict === 'pending'
          ? 'טווח המתנה רשמי'
          : 'אימות רשמי',
    explanation:
      decision === 'eligible_to_apply'
        ? `${explanationPrefix} אישר עמידה בסף המספרי. עדיין נדרשים מבדק התאמה, ולעיתים גם ראיון אישי; זו אינה קבלה סופית.`
        : officialVerdict === 'pending'
          ? `${explanationPrefix} הציב את הציון בין סף הדחייה לסף הקבלה, ולכן עדיין אין החלטה סופית.`
          : `${explanationPrefix} סיפק ציון וסף קבלה מעודכנים למסלול זה.`,
    nextAction:
      decision === 'accepted'
        ? 'בדקו את דף ההרשמה הרשמי והשלימו את בדיקת העבר האקדמי, העברית ושאר דרישות המסמכים.'
        : decision === 'eligible_to_apply'
          ? 'השלימו את מבדק ההתאמה ועקבו אחר זימון אפשרי לראיון מטעם החוג.'
          : decision === 'below'
            ? 'שמרו את המסלול והשוו מול מוסדות אחרים או שפרו את הנתונים לפני הרשמה.'
            : 'עקבו אחר עדכון הספים באתר הרשמי או פנו למרכז הרישום.',
    score,
    scoreLabel,
    threshold,
  };
}

function exactGateFailureResult(args: {
  institution: CatalogueInstitution;
  unmetRequirements: string[];
  requirementsUrl: string;
}): AdmissionsEvaluationResult {
  return {
    institution: publicInstitutionShape(args.institution),
    linkedInstitutionId: args.institution.id,
    capability: 'exact',
    kind: 'exact',
    decision: 'below',
    confidence: 'high',
    sourceLabel: 'תנאי קבלה רשמיים',
    explanation: `לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ${args.unmetRequirements.join('; ')}.`,
    nextAction: 'שפרו את תנאי הסף או בדקו אפיק קבלה חלופי באתר התוכנית.',
    officialUrls: [args.requirementsUrl],
  };
}

function evaluateNonExactResult(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  entry: AdmissionsCapabilityEntry;
  exactCallsBounded: boolean;
}): AdmissionsEvaluationResult {
  const { input, program, institution, entry, exactCallsBounded } = args;

  const evidenceRecord =
    entry.evidence ?? getMondayAdmissionEvidenceByCatalogueInstitutionId(institution.id)[0];
  const dynamicRequirements = getDynamicRequirementsFromEvidence(evidenceRecord);

  if (entry.capability === 'needs_input') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'נדרשים נתונים נוספים',
      explanation: 'כדי לחשב מסלול זה דרך המקור הרשמי צריך גם תתי-ציונים בפסיכומטרי.',
      nextAction: 'השלימו ציוני כמותי, מילולי ואנגלית כדי לקבל אימות רשמי.',
      requiredInputs: entry.requiredInputs,
    };
  }

  if (entry.capability === 'tracked_missing_rule') {
    return trackedMissingRuleResult(institution, entry);
  }

  if (entry.capability === 'authority_unavailable') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'authority_unavailable',
      kind: 'authority_unavailable',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'האימות הרשמי טרם הושלם',
      explanation:
        entry.pairVerification?.reason ??
        'עדיין אין למסלול זה שתי דוגמאות גבול והשוואה חיה של הציון והחלטת הקבלה מול המקור הרשמי.',
      nextAction: entry.pairVerification?.sourceUrl
        ? 'בדקו בינתיים ישירות במחשבון הרשמי של המוסד.'
        : 'בדקו בינתיים ישירות באתר המוסד.',
      officialUrls: entry.pairVerification?.sourceUrl
        ? [entry.pairVerification.sourceUrl]
        : undefined,
      degradationReason: 'pair_verification_incomplete',
    };
  }

  if (entry.formulaPairScope === 'excluded') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'unsupported',
      kind: 'unsupported',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מחוץ להיקף האימות',
      explanation:
        'מסלולי אריאל ובר־אילן מוחרגים במפורש מפרויקט אימות המחשבונים הנוכחי, ולכן לא נציג עבורם תוצאת קבלה משוערת.',
      nextAction: 'בדקו את תנאי הקבלה והמחשבון ישירות באתר המוסד.',
    };
  }

  if (entry.capability === 'blocked') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'blocked',
      kind: 'unsupported',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מקור חסום',
      explanation: entry.sourceTarget?.blockedReason ?? 'המקור הרשמי דורש דפדפן או תהליך ידני.',
      nextAction: entry.sourceTarget?.nextAction ?? 'בדקו ישירות באתר המוסד.',
    };
  }

  if (entry.capability === 'stale' || exactCallsBounded) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: entry.capability === 'stale' ? 'stale' : 'unsupported',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי לא זמין',
      explanation:
        entry.capability === 'stale'
          ? 'מצב המקור הרשמי מיושן או נכשל לאחרונה, ולכן לא נציג החלטה רשמית.'
          : 'הוגבל מספר קריאות האימות הרשמיות לבקשה זו.',
      nextAction: 'נסו שוב מאוחר יותר או בדקו ישירות במקור הרשמי.',
      degradationReason: entry.capability === 'stale' ? 'source_stale' : 'exact_fanout_limited',
    };
  }

  if (entry.capability === 'open_admission') {
    const defaultText =
      'מוסד זה מציע אפיק קבלה פתוחה ללא צורך בציון פסיכומטרי או ממוצע בגרות מינימלי.';
    const explanation = evidenceRecord?.decisionReason || defaultText;
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'open_admission',
      kind: 'open_admission',
      decision: 'accepted',
      confidence: 'high',
      sourceLabel: 'קבלה פתוחה',
      explanation,
      nextAction: 'הירשמו ישירות למסלול הלימודים באתר הרשמי של המוסד.',
    };
  }

  if (entry.capability === 'manual_gate') {
    const verifiedThreshold = getVerifiedProgramThreshold(entry.evidence, program.id);
    if (verifiedThreshold?.thresholdKind === 'invitation_to_manual_gate') {
      if (verifiedThreshold.scoreKind === 'psychometric') {
        const thresholdExplanation =
          verifiedThreshold.notes ??
          'הציון הרשמי כאן הוא סף זימון להמשך מיון ידני, ולא קבלה סופית למסלול.';
        const psychometricGap = Math.max(0, verifiedThreshold.threshold - input.psychometric);

        if (psychometricGap > 0) {
          return {
            institution: publicInstitutionShape(institution),
            linkedInstitutionId: institution.id,
            capability: 'manual_gate',
            kind: 'manual_gate',
            decision: 'below',
            confidence: 'high',
            sourceLabel: 'סף זימון נדרש',
            explanation: `לפי המקור הרשמי, צריך להגיע לפחות לפסיכומטרי ${verifiedThreshold.threshold} כדי לעבור לשלב המיון הידני. ${thresholdExplanation}`,
            nextAction:
              'שפרו את ציון הפסיכומטרי או בדקו מול המוסד אם קיים אפיק חריגים. גם מעבר סף הזימון לא מבטיח קבלה סופית.',
            score: input.psychometric,
            scoreLabel: 'פסיכומטרי',
            threshold: verifiedThreshold.threshold,
            deltaNeeded: {
              psychometric: psychometricGap,
              bagrut: 0,
            },
          };
        }

        return {
          institution: publicInstitutionShape(institution),
          linkedInstitutionId: institution.id,
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'eligible_to_apply',
          confidence: 'high',
          sourceLabel: 'נדרש מיון נוסף',
          explanation: `לפי המקור הרשמי, הגעתם לסף הזימון בפסיכומטרי ${verifiedThreshold.threshold}. ${thresholdExplanation}`,
          nextAction: 'הגישו מועמדות והשלימו את שלבי המיון הידניים או המבחנים הנדרשים למסלול.',
          score: input.psychometric,
          scoreLabel: 'פסיכומטרי',
          threshold: verifiedThreshold.threshold,
        };
      }

      const missingRequiredInputs = getMissingRequiredInputsForEstimate(
        input,
        program,
        institution,
      );
      if (missingRequiredInputs.length > 0) {
        return requiredInputsResult(institution, missingRequiredInputs);
      }

      const calculatorInstitution = getCalculatorInstitutionsFromCatalogue([institution])[0];
      if (calculatorInstitution) {
        const [evaluation] = evaluateUniversities(
          [calculatorInstitution as University],
          {
            ...program,
            thresholds: {
              ...(program.thresholds ?? {}),
              [institution.id]: verifiedThreshold.threshold,
            },
          },
          {
            psychometric: input.psychometric,
            bagrut: input.bagrut,
            mathGrade: input.extraInputs?.mathGrade,
            mathUnits: input.extraInputs?.mathUnits,
            englishGrade: input.extraInputs?.englishGrade,
            englishUnits: input.extraInputs?.englishUnits,
            physicsGrade: input.extraInputs?.physicsGrade,
            physicsUnits: input.extraInputs?.physicsUnits,
            csGrade: input.extraInputs?.csGrade,
            csUnits: input.extraInputs?.csUnits,
          },
          { hasMath5: false, hasPhysics5: false },
        );

        if (evaluation && evaluation.status !== 'unavailable') {
          const thresholdExplanation =
            verifiedThreshold.notes ??
            'הסכם הרשמי כאן הוא סף זימון להמשך מיון ידני, ולא קבלה סופית למסלול.';

          if (evaluation.status === 'below') {
            return {
              institution: publicInstitutionShape(institution),
              linkedInstitutionId: institution.id,
              capability: 'manual_gate',
              kind: 'manual_gate',
              decision: 'below',
              confidence: 'high',
              sourceLabel: 'סף זימון נדרש',
              explanation: `לפי המקור הרשמי, צריך להגיע לפחות לסכם ${verifiedThreshold.threshold} כדי לעבור לשלב המיון הידני. ${thresholdExplanation}`,
              nextAction:
                'שפרו את הנתונים שמופיעים בפער לפני הרשמה. גם מעבר סף הזימון לא מבטיח קבלה סופית.',
              score: evaluation.sekhem,
              scoreLabel: 'סכם',
              threshold: verifiedThreshold.threshold,
              deltaNeeded: evaluation.deltaNeeded,
            };
          }

          return {
            institution: publicInstitutionShape(institution),
            linkedInstitutionId: institution.id,
            capability: 'manual_gate',
            kind: 'manual_gate',
            decision: 'eligible_to_apply',
            confidence: 'high',
            sourceLabel: 'נדרש מיון נוסף',
            explanation: `לפי המקור הרשמי, הגעתם לסף הזימון ${verifiedThreshold.threshold}. ${thresholdExplanation}`,
            nextAction: 'הגישו מועמדות והשלימו את שלבי המיון הידניים או הראיונות שנדרשים למסלול.',
            score: evaluation.sekhem,
            scoreLabel: 'סכם',
            threshold: verifiedThreshold.threshold,
          };
        }
      }
    }

    const detail = findInstitutionDetail(program, institution);
    const structuredResult = evaluateStructuredRequirementsResult({
      input,
      institution,
      capability: 'manual_gate',
      detail,
      dynamicRequirements,
      eligibleWithManualGate: entry.evidence?.publicBucket === 'eligible_with_manual_gate',
      programType: program.type,
    });
    if (structuredResult) {
      return structuredResult;
    }

    const factsList = detail?.admissionFacts?.map((fact) => fact.description) ?? [];
    const notesList = detail?.specificAdmissionNotes ?? [];
    const allRequirements = [
      ...program.admissionRequirements,
      ...factsList,
      ...notesList,
      ...dynamicRequirements,
    ];
    const eligibleWithManualGate = entry.evidence?.publicBucket === 'eligible_with_manual_gate';

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
      confidence: 'high',
      sourceLabel: 'אפשר להגיש מועמדות',
      explanation:
        allRequirements.length > 0
          ? eligibleWithManualGate
            ? `לפי המקור הרשמי יש למסלול מסלול קבלה אוטומטי וגם אפיק קבלה חלופי דרך מכינה, מרכז הרישום או מיון ידני. בדקו את התנאים הבאים: ${allRequirements.join('; ')}`
            : `לפי תנאי הקבלה שמופו, אין סף ציונים אוטומטי שמונע הגשה. עדיין צריך להשלים: ${allRequirements.join('; ')}`
          : eligibleWithManualGate
            ? 'לפי המקור הרשמי יש למסלול מסלול קבלה אוטומטי וגם אפיק קבלה חלופי דרך מכינה, מרכז הרישום או מיון ידני.'
            : 'לפי תנאי הקבלה שמופו, אין סף ציונים אוטומטי שמונע הגשה. הקבלה עדיין תלויה במיונים ידניים כגון תיק עבודות, מבחן מעשי או ראיון.',
      nextAction: eligibleWithManualGate
        ? 'בדקו אם אתם עומדים במסלול הקבלה האוטומטי; אם לא, פנו למרכז הרישום או למכינה המתאימה באתר המוסד.'
        : 'הגישו מועמדות ובדקו את מועדי תיק העבודות, המבחנים או הראיונות באתר המוסד.',
    };
  }

  if (entry.capability === 'requirements_only') {
    const detail = findInstitutionDetail(program, institution);
    const structuredResult = evaluateStructuredRequirementsResult({
      input,
      institution,
      capability: 'requirements_only',
      detail,
      dynamicRequirements,
      eligibleWithManualGate: entry.evidence?.publicBucket === 'eligible_with_manual_gate',
      programType: program.type,
    });
    if (structuredResult) {
      return structuredResult;
    }

    const notesList = detail?.specificAdmissionNotes ?? [];
    const allRequirements = [
      ...(program.admissionRequirements ?? []),
      ...notesList,
      ...dynamicRequirements,
    ];

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'requirements_only',
      kind: 'requirements_only',
      decision: 'unknown',
      confidence: 'medium',
      sourceLabel: 'דרישות קבלה',
      explanation:
        allRequirements.length > 0
          ? `תנאי קבלה למסלול זה: ${allRequirements.join('; ')}`
          : 'מוסד זה דורש עמידה בתנאי קבלה שטרם מופו באופן מלא. בדקו את האתר הרשמי לפרטים נוספים.',
      nextAction: 'בדקו את תנאי הקבלה המלאים באתר הרשמי של המוסד.',
    };
  }

  if (entry.capability === 'estimated' || entry.capability === 'score_only') {
    const missingRequiredInputs = getMissingRequiredInputsForEstimate(input, program, institution);
    if (missingRequiredInputs.length > 0) {
      return requiredInputsResult(institution, missingRequiredInputs);
    }

    const calculatorInstitution = getCalculatorInstitutionsFromCatalogue([institution])[0];
    if (!calculatorInstitution) {
      return unsupportedResult(institution, entry);
    }

    const [evaluation] = evaluateUniversities(
      [calculatorInstitution as University],
      program,
      {
        psychometric: input.psychometric,
        bagrut: input.bagrut,
        mathGrade: input.extraInputs?.mathGrade,
        mathUnits: input.extraInputs?.mathUnits,
        englishGrade: input.extraInputs?.englishGrade,
        englishUnits: input.extraInputs?.englishUnits,
        physicsGrade: input.extraInputs?.physicsGrade,
        physicsUnits: input.extraInputs?.physicsUnits,
        csGrade: input.extraInputs?.csGrade,
        csUnits: input.extraInputs?.csUnits,
      },
      { hasMath5: false, hasPhysics5: false },
    );

    if (!evaluation || evaluation.status === 'unavailable') {
      return unsupportedResult(institution, entry);
    }

    const officialUrls = entry.evidence?.officialUrls.length
      ? [...entry.evidence.officialUrls]
      : [];
    const sourceBlocked =
      entry.evidence?.officialVerificationStatus.startsWith('blocked_') ?? false;
    const defaultExplanation = sourceBlocked
      ? 'המקור הרשמי חסום כרגע, לכן התוצאה מבוססת על נוסחת סכם ממופה ועל סף קבלה שנשמר בקטלוג, בלי אימות חי של אתר המוסד.'
      : entry.capability === 'estimated'
        ? 'התוצאה מבוססת על נוסחת סכם וסף קבלה שמופו ממקור מוסדי ונבדקו בקטלוג.'
        : 'התוצאה מבוססת על נוסחת סכם ממופה וסף קבלה שנבדק בקטלוג, כשהמקור הרשמי מספק חלק מהמידע.';
    const defaultNextAction = sourceBlocked
      ? (entry.evidence?.nextAction ??
        'בדקו ישירות באתר המוסד או במחשבון הרשמי כשהוא זמין, לפני קבלת החלטה סופית.')
      : evaluation.status === 'accepted'
        ? 'המשיכו להרשמה ובדקו מועדים, מסמכים ודרישות משלימות באתר המוסד.'
        : 'שפרו את הנתונים שמופיעים בפער או השוו למסלולים אחרים שבהם אתם עומדים בסף.';

    return applyStructuredRequirementsToAcceptedScoreResult({
      input,
      program,
      institution,
      baseResult: {
        institution: publicInstitutionShape(institution),
        linkedInstitutionId: institution.id,
        capability: entry.capability,
        kind: 'estimated',
        decision: evaluation.status === 'accepted' ? 'accepted' : 'below',
        confidence: sourceBlocked ? 'medium' : entry.capability === 'estimated' ? 'high' : 'medium',
        sourceLabel: sourceBlocked
          ? 'כלל קבלה ממופה, מקור רשמי חסום'
          : entry.capability === 'estimated'
            ? 'כלל קבלה ממופה'
            : 'כלל קבלה ממופה ממקור חלקי',
        explanation: evaluation.explanation ?? defaultExplanation,
        nextAction: defaultNextAction,
        score: evaluation.sekhem,
        scoreLabel: 'סכם',
        threshold: evaluation.threshold,
        deltaNeeded: evaluation.deltaNeeded,
        evidenceItemId: entry.evidence?.itemId,
        evidenceItemName: entry.evidence?.itemName,
        officialUrls,
      },
    });
  }

  return unsupportedResult(institution, entry);
}

function getMissingRequiredInputsForEstimate(
  input: AdmissionsEvaluationInput,
  program: CatalogueProgram,
  institution: CatalogueInstitution,
): AdmissionsRequiredInput[] {
  if (institution.id === 'afeka') {
    return missingInputs(input, ['math_units', 'math_grade', 'english_units', 'english_grade']);
  }

  if (institution.id === 'hit' && isHitTechnicalProgram(program)) {
    return missingInputs(input, ['math_units', 'math_grade']);
  }

  return [];
}

function getDynamicRequirementsFromEvidence(
  evidenceRecord: MondayAdmissionEvidenceRecord | undefined,
) {
  const dynamicRequirements: string[] = [];

  if (evidenceRecord?.noBagrutNeeded) {
    dynamicRequirements.push('אין צורך בבגרות');
  }
  if (evidenceRecord?.noPsychometricNeeded) {
    dynamicRequirements.push('אין צורך בפסיכומטרי');
  }
  if (evidenceRecord?.interviewNeeded) {
    dynamicRequirements.push('ראיון קבלה חובה');
  }
  if (evidenceRecord?.portfolioNeeded) {
    dynamicRequirements.push('הגשת תיק עבודות חובה');
  }

  return dynamicRequirements;
}

type ProgramInstitutionDetail = NonNullable<CatalogueProgram['institutionDetails']>[number];

interface StructuredRequirementsResultArgs {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
  capability: 'manual_gate' | 'requirements_only';
  detail: ProgramInstitutionDetail | undefined;
  dynamicRequirements: string[];
  eligibleWithManualGate: boolean;
  programType: CatalogueProgram['type'];
}

interface StructuredNumericFactResult {
  description: string;
  field: string;
  comparison: string;
  expected: number;
  actual: number;
}

interface GroupedNumericFactOptionResult {
  descriptions: string[];
  metDescriptions: string[];
  missingRequiredInputs: Set<AdmissionsRequiredInput>;
  unmetFacts: StructuredNumericFactResult[];
}

function evaluateStructuredRequirementsResult(
  args: StructuredRequirementsResultArgs,
): AdmissionsEvaluationResult | undefined {
  const {
    input,
    institution,
    capability,
    detail,
    dynamicRequirements,
    eligibleWithManualGate,
    programType,
  } = args;

  if (!detail?.admissionFacts?.length) {
    return undefined;
  }

  const facts = detail.admissionFacts;
  const alternativePathDescriptions =
    detail.admissionAlternativePaths?.map((path) => path.title) ?? [];
  const notesList = detail.specificAdmissionNotes ?? [];
  const manualGateDescriptions = facts
    .filter((fact) => fact.kind === 'manual_gate')
    .map((fact) => fact.description);
  const numericFacts = facts.filter((fact) => fact.kind === 'numeric_gate');
  const hasOpenAdmissionFact = facts.some((fact) => fact.kind === 'open_admission');
  const hasNoFormalGradeGate = facts.some(
    (fact) =>
      fact.kind === 'explicit_absence' &&
      (fact.field === 'psychometric' || fact.field === 'bagrut_average'),
  );

  const missingRequiredInputs = new Set<AdmissionsRequiredInput>();
  const unmetNumericFacts: StructuredNumericFactResult[] = [];
  const metNumericDescriptions: string[] = [];
  const commonNumericFacts: typeof numericFacts = [];
  const groupedNumericFacts = new Map<string, Map<string, typeof numericFacts>>();

  for (const fact of numericFacts) {
    const groupKey = getAdmissionFactGroupKey(fact);
    if (!groupKey) {
      commonNumericFacts.push(fact);
      continue;
    }

    const [groupCategory, groupOption = groupKey] = groupKey.split('/', 2);
    const options =
      groupedNumericFacts.get(groupCategory) ?? new Map<string, typeof numericFacts>();
    const factsForOption = options.get(groupOption) ?? [];
    factsForOption.push(fact);
    options.set(groupOption, factsForOption);
    groupedNumericFacts.set(groupCategory, options);
  }

  for (const fact of commonNumericFacts) {
    const evaluation = evaluateStructuredNumericFact(input, fact);
    if (evaluation.kind === 'missing_input') {
      missingRequiredInputs.add(evaluation.requiredInput);
      continue;
    }

    if (evaluation.kind === 'pass') {
      metNumericDescriptions.push(fact.description);
      continue;
    }

    if (evaluation.kind === 'fail') {
      unmetNumericFacts.push(evaluation.result);
    }
  }

  for (const [, optionFactsByKey] of groupedNumericFacts) {
    const optionResults = [...optionFactsByKey.values()].map((optionFacts) =>
      evaluateGroupedNumericFactOption(input, optionFacts),
    );
    const passedOption = optionResults.find(
      (option) => option.unmetFacts.length === 0 && option.missingRequiredInputs.size === 0,
    );

    if (passedOption) {
      metNumericDescriptions.push(...passedOption.metDescriptions);
      continue;
    }

    const optionsNeedingInputs = optionResults.filter(
      (option) => option.unmetFacts.length === 0 && option.missingRequiredInputs.size > 0,
    );

    if (optionsNeedingInputs.length > 0) {
      for (const option of optionsNeedingInputs) {
        for (const requiredInput of option.missingRequiredInputs) {
          missingRequiredInputs.add(requiredInput);
        }
      }
      continue;
    }

    const firstOptionWithUnmetFacts = optionResults.find((option) => option.unmetFacts.length > 0);
    if (firstOptionWithUnmetFacts) {
      unmetNumericFacts.push(...firstOptionWithUnmetFacts.unmetFacts);
    }
  }

  if (missingRequiredInputs.size > 0) {
    return requiredInputsResult(institution, [...missingRequiredInputs]);
  }

  if (hasOpenAdmissionFact && numericFacts.length === 0 && manualGateDescriptions.length === 0) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'open_admission',
      kind: 'open_admission',
      decision: 'accepted',
      confidence: 'high',
      sourceLabel: 'קבלה פתוחה',
      explanation:
        facts.find((fact) => fact.kind === 'open_admission')?.description ??
        'לפי התנאים שמופו, המסלול פתוח להרשמה ללא סף ציונים פורמלי.',
      nextAction: 'המשיכו לרישום ובדקו באתר המוסד את המסמכים או המועדים הרלוונטיים.',
    };
  }

  const allRequirements = [
    ...metNumericDescriptions,
    ...manualGateDescriptions,
    ...alternativePathDescriptions,
    ...notesList,
    ...dynamicRequirements,
  ];

  if (unmetNumericFacts.length > 0) {
    const firstUnmet = unmetNumericFacts[0];

    if (alternativePathDescriptions.length > 0) {
      return {
        institution: publicInstitutionShape(institution),
        linkedInstitutionId: institution.id,
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        confidence: 'high',
        sourceLabel: 'קיימים אפיקים חלופיים',
        explanation: `לפי המסלול הישיר שמופה, עדיין חסר לעמוד בדרישות הבאות: ${unmetNumericFacts
          .map((fact) => fact.description)
          .join(
            '; ',
          )}. עדיין קיימים אפיקים חלופיים שאפשר לבדוק מול המוסד: ${alternativePathDescriptions.join('; ')}.`,
        nextAction:
          manualGateDescriptions.length > 0
            ? 'בדקו מול המוסד איזה אפיק חלופי רלוונטי לכם, והשלימו גם את שלבי הבדיקה או המיון הידניים שנדרשים במסלול הזה.'
            : 'בדקו מול המוסד איזה אפיק חלופי רלוונטי לכם והאם הוא מחייב מכינה, מסמכים משלימים או שלב מיון נוסף.',
        ...(singleNumericGateMetrics(firstUnmet) ?? {}),
      };
    }

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability,
      kind: capability === 'requirements_only' ? 'requirements_only' : 'manual_gate',
      decision: 'below',
      confidence: 'high',
      sourceLabel: 'לא עומדים בסף',
      explanation: `לפי התנאים שמופו, עדיין חסר לעמוד בדרישות הבאות: ${unmetNumericFacts
        .map((fact) => fact.description)
        .join('; ')}.`,
      nextAction:
        manualGateDescriptions.length > 0
          ? 'שפרו את תנאי הסף המספריים לפני ההגשה. לאחר מכן עדיין תצטרכו להשלים את שלבי המיון הידניים של המוסד.'
          : 'שפרו את תנאי הסף המספריים או בדקו אפיק חלופי באתר המוסד.',
      ...(singleNumericGateMetrics(firstUnmet) ?? {}),
    };
  }

  if (manualGateDescriptions.length > 0 || alternativePathDescriptions.length > 0) {
    const directEligibilityPrefix =
      metNumericDescriptions.length > 0
        ? 'עמדתם בתנאים המספריים שמופו.'
        : eligibleWithManualGate
          ? 'לפי הכללים שמופו, אפשר להתקדם עם המועמדות.'
          : 'אפשר להתקדם עם המועמדות.';
    const remainingManualSteps =
      manualGateDescriptions.length > 0
        ? ` עדיין צריך להשלים את השלבים הבאים: ${manualGateDescriptions.join('; ')}.`
        : '';
    const alternativeRoutesNote =
      alternativePathDescriptions.length > 0
        ? ` קיימים גם אפיקים חלופיים שהמוסד מפרסם: ${alternativePathDescriptions.join('; ')}.`
        : '';
    const notesExplanation =
      notesList.length > 0 || dynamicRequirements.length > 0
        ? ` מידע רלוונטי נוסף: ${[...notesList, ...dynamicRequirements].join('; ')}.`
        : '';

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
      confidence: 'high',
      sourceLabel: manualGateDescriptions.length > 0 ? 'נדרש מיון נוסף' : 'אפשר להגיש מועמדות',
      explanation:
        manualGateDescriptions.length > 0 ||
        alternativePathDescriptions.length > 0 ||
        notesList.length > 0 ||
        dynamicRequirements.length > 0
          ? `${directEligibilityPrefix}${remainingManualSteps}${alternativeRoutesNote}${notesExplanation}`.trim()
          : 'אפשר להתקדם עם המועמדות, אך יש שלבים ידניים שהמוסד משלים אחרי ההגשה.',
      nextAction:
        alternativePathDescriptions.length > 0
          ? 'בדקו איזה אפיק הגשה או מכינה רלוונטיים לכם באתר המוסד, והשלימו את שלבי המיון הידניים.'
          : 'הגישו מועמדות והשלימו את הראיון, הוועדה, תיק העבודות או שאר שלבי המיון באתר המוסד.',
    };
  }

  if (hasNoFormalGradeGate) {
    const registerLabel =
      programType === 'certificate' ||
      programType === 'vocational' ||
      programType === 'short-course'
        ? 'אפשר להירשם'
        : 'אפשר להגיש מועמדות';

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability,
      kind: capability === 'requirements_only' ? 'requirements_only' : 'manual_gate',
      decision: 'eligible_to_apply',
      confidence: 'high',
      sourceLabel: registerLabel,
      explanation:
        allRequirements.length > 0
          ? `לפי התנאים שמופו, אין למסלול סף ציונים פורמלי שחוסם הגשה. מידע רלוונטי: ${allRequirements.join('; ')}`
          : 'לפי התנאים שמופו, אין למסלול סף ציונים פורמלי שחוסם הגשה.',
      nextAction:
        programType === 'certificate' ||
        programType === 'vocational' ||
        programType === 'short-course'
          ? 'המשיכו לרישום ובדקו באתר המוסד מסמכי הרשמה, מועדים ודרישות אדמיניסטרטיביות.'
          : 'הגישו מועמדות ובדקו באתר המוסד מסמכי הרשמה, מועדים ודרישות משלימות.',
    };
  }

  return undefined;
}

function applyStructuredRequirementsToAcceptedScoreResult(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  baseResult: AdmissionsEvaluationResult;
}): AdmissionsEvaluationResult {
  const { input, program, institution, baseResult } = args;

  if (baseResult.decision !== 'accepted') {
    return baseResult;
  }

  const detail = findInstitutionDetail(program, institution);
  if (!detail?.admissionFacts?.length) {
    return baseResult;
  }

  const hasManualStage =
    detail.admissionFacts.some((fact) => fact.kind === 'manual_gate') ||
    Boolean(detail.admissionAlternativePaths?.length);
  const structuredResult = evaluateStructuredRequirementsResult({
    input,
    institution,
    capability: hasManualStage ? 'manual_gate' : 'requirements_only',
    detail,
    dynamicRequirements: [],
    eligibleWithManualGate: false,
    programType: program.type,
  });

  if (!structuredResult) {
    return baseResult;
  }

  return {
    ...structuredResult,
    ...(baseResult.score !== undefined && structuredResult.score === undefined
      ? { score: baseResult.score }
      : {}),
    ...(baseResult.scoreLabel !== undefined && structuredResult.scoreLabel === undefined
      ? { scoreLabel: baseResult.scoreLabel }
      : {}),
    ...(baseResult.threshold !== undefined && structuredResult.threshold === undefined
      ? { threshold: baseResult.threshold }
      : {}),
    ...(baseResult.deltaNeeded !== undefined && structuredResult.deltaNeeded === undefined
      ? { deltaNeeded: baseResult.deltaNeeded }
      : {}),
  };
}

function readNumericAdmissionFactValue(
  input: AdmissionsEvaluationInput,
  field: string,
): { actual: number | undefined; requiredInput?: AdmissionsRequiredInput } {
  switch (field) {
    case 'psychometric':
      return { actual: input.psychometric };
    case 'bagrut_average':
      return { actual: input.bagrut };
    case 'psychometric_quantitative':
      return { actual: input.extraInputs?.psychometricMath, requiredInput: 'psychometric_math' };
    case 'psychometric_english':
      return {
        actual: input.extraInputs?.psychometricEnglish,
        requiredInput: 'psychometric_english',
      };
    case 'math_units':
      return { actual: input.extraInputs?.mathUnits, requiredInput: 'math_units' };
    case 'math_grade':
      return { actual: input.extraInputs?.mathGrade, requiredInput: 'math_grade' };
    case 'english_units':
      return { actual: input.extraInputs?.englishUnits, requiredInput: 'english_units' };
    case 'english_grade':
      return { actual: input.extraInputs?.englishGrade, requiredInput: 'english_grade' };
    case 'physics_units':
      return { actual: input.extraInputs?.physicsUnits, requiredInput: 'physics_units' };
    case 'physics_grade':
      return { actual: input.extraInputs?.physicsGrade, requiredInput: 'physics_grade' };
    case 'cs_units':
      return { actual: input.extraInputs?.csUnits, requiredInput: 'cs_units' };
    case 'cs_grade':
      return { actual: input.extraInputs?.csGrade, requiredInput: 'cs_grade' };
    default:
      return { actual: undefined };
  }
}

function getAdmissionFactGroupKey(
  fact: NonNullable<ProgramInstitutionDetail['admissionFacts']>[number],
) {
  if (fact.groupKey) {
    return fact.groupKey;
  }

  const encodedGroupKey = fact.id.match(/:fact:group:([^:]+):/u)?.[1];
  return encodedGroupKey ? decodeURIComponent(encodedGroupKey) : undefined;
}

function evaluateStructuredNumericFact(
  input: AdmissionsEvaluationInput,
  fact: NonNullable<ProgramInstitutionDetail['admissionFacts']>[number],
):
  | { kind: 'pass' }
  | { kind: 'missing_input'; requiredInput: AdmissionsRequiredInput }
  | { kind: 'skip' }
  | { kind: 'fail'; result: StructuredNumericFactResult } {
  const value = readNumericAdmissionFactValue(input, fact.field);

  if (value.requiredInput && value.actual === undefined) {
    return {
      kind: 'missing_input',
      requiredInput: value.requiredInput,
    };
  }

  if (value.actual === undefined || fact.valueNumber === null) {
    return { kind: 'skip' };
  }

  if (compareAdmissionFactValue(value.actual, fact.comparison, fact.valueNumber)) {
    return { kind: 'pass' };
  }

  return {
    kind: 'fail',
    result: {
      description: fact.description,
      field: fact.field,
      comparison: fact.comparison,
      expected: fact.valueNumber,
      actual: value.actual,
    },
  };
}

function evaluateGroupedNumericFactOption(
  input: AdmissionsEvaluationInput,
  facts: NonNullable<ProgramInstitutionDetail['admissionFacts']>,
): GroupedNumericFactOptionResult {
  const descriptions: string[] = [];
  const metDescriptions: string[] = [];
  const missingRequiredInputs = new Set<AdmissionsRequiredInput>();
  const unmetFacts: StructuredNumericFactResult[] = [];

  for (const fact of facts) {
    descriptions.push(fact.description);

    const evaluation = evaluateStructuredNumericFact(input, fact);
    if (evaluation.kind === 'pass') {
      metDescriptions.push(fact.description);
      continue;
    }

    if (evaluation.kind === 'missing_input') {
      missingRequiredInputs.add(evaluation.requiredInput);
      continue;
    }

    if (evaluation.kind === 'fail') {
      unmetFacts.push(evaluation.result);
    }
  }

  return {
    descriptions,
    metDescriptions,
    missingRequiredInputs:
      unmetFacts.length > 0 ? new Set<AdmissionsRequiredInput>() : missingRequiredInputs,
    unmetFacts,
  };
}

function compareAdmissionFactValue(actual: number, comparison: string, expected: number) {
  switch (comparison) {
    case 'gte':
      return actual >= expected;
    case 'lte':
      return actual <= expected;
    case 'eq':
      return actual === expected;
    default:
      return false;
  }
}

function singleNumericGateMetrics(fact: StructuredNumericFactResult) {
  const common = { threshold: fact.expected };

  if (fact.field === 'psychometric') {
    return {
      ...common,
      score: fact.actual,
      scoreLabel: 'פסיכומטרי',
      deltaNeeded: {
        psychometric: Math.max(0, fact.expected - fact.actual),
        bagrut: 0,
      },
    };
  }

  if (fact.field === 'bagrut_average') {
    return {
      ...common,
      score: fact.actual,
      scoreLabel: 'ממוצע בגרות',
      deltaNeeded: {
        psychometric: 0,
        bagrut: Math.max(0, fact.expected - fact.actual),
      },
    };
  }

  return common;
}

function missingInputs(
  input: AdmissionsEvaluationInput,
  requiredInputs: AdmissionsRequiredInput[],
): AdmissionsRequiredInput[] {
  return requiredInputs.filter(
    (requiredInput) => admissionsInputValue(input.extraInputs, requiredInput) === undefined,
  );
}

function findInstitutionDetail(
  program: CatalogueProgram,
  institution: CatalogueInstitution,
): ProgramInstitutionDetail | undefined {
  return program.institutionDetails?.find(
    (detail) =>
      detail.institutionName === institution.name ||
      detail.officialCalculatorUrl?.includes(institution.id) ||
      detail.programUrl?.includes(institution.id),
  );
}

function isHitTechnicalProgram(program: CatalogueProgram): boolean {
  return (
    program.id.includes('cs') ||
    program.id.includes('ee') ||
    program.category === 'הנדסה וטכנולוגיה'
  );
}

function requiredInputsResult(
  institution: CatalogueInstitution,
  requiredInputs: AdmissionsRequiredInput[],
): AdmissionsEvaluationResult {
  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'needs_input',
    kind: 'needs_input',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'נדרשים נתונים נוספים',
    explanation: 'כדי לחשב את המסלול במוסד זה צריך נתוני מקצועות בגרות שהמחשבון הרשמי משתמש בהם.',
    nextAction: 'השלימו את יחידות וציון המקצועות החסרים כדי לקבל הערכה למסלול.',
    requiredInputs,
  };
}

function unsupportedResult(
  institution: CatalogueInstitution,
  entry: AdmissionsCapabilityEntry,
): AdmissionsEvaluationResult {
  if (entry.evidence?.publicBucket === 'tracked_missing_rule') {
    return trackedMissingRuleResult(institution, entry);
  }

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: entry.capability,
    kind: 'unsupported',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'אין מספיק מידע',
    explanation:
      entry.sourceTarget?.limitations[0] ??
      'אין כרגע מספיק מידע מאומת כדי לחשב תוצאה אמינה למסלול זה.',
    nextAction: entry.sourceTarget?.nextAction ?? 'בדקו ישירות באתר המוסד.',
  };
}

function trackedMissingRuleResult(
  institution: CatalogueInstitution,
  entry: AdmissionsCapabilityEntry,
): AdmissionsEvaluationResult {
  const evidence = entry.evidence;
  const missingData = evidence?.missingData.length ? [...evidence.missingData] : ['official_rule'];
  const officialUrls = evidence?.officialUrls.length ? [...evidence.officialUrls] : [];
  const readableMissing = missingData.join(', ');

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'tracked_missing_rule',
    kind: 'tracked_missing_rule',
    decision: 'unknown',
    confidence: evidence?.confidence ?? 'medium',
    sourceLabel: 'חסר כלל רשמי ממופה',
    explanation: evidence
      ? `עדיין חסר כלל רשמי כדי לתת החלטת קבלה: ${readableMissing}. מקור העבודה: ${evidence.itemName}.`
      : `עדיין חסר כלל רשמי כדי לתת החלטת קבלה: ${readableMissing}.`,
    nextAction:
      evidence?.nextAction ??
      entry.sourceTarget?.nextAction ??
      'צריך להשלים אימות רשמי לפני שנציג קבלה או דחייה.',
    evidenceItemId: evidence?.itemId,
    evidenceItemName: evidence?.itemName,
    missingData,
    officialUrls,
  };
}

function publicInstitutionShape(
  institution: CatalogueInstitution,
): AdmissionsEvaluationResult['institution'] {
  return {
    id: institution.id,
    name: institution.name,
    region: institution.region,
    domain: institution.domain,
    logoUrl: institution.logoUrl,
    programUrl: institution.programUrl,
    calculatorUrl: institution.calculatorUrl,
    universityId: institution.universityId,
  };
}

function getVerifiedProgramThreshold(
  evidence: MondayAdmissionEvidenceRecord | undefined,
  programId: string,
) {
  return evidence?.verifiedProgramThresholds?.find((entry) => entry.programId === programId);
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function withTimeout(fetcher: typeof fetch, timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetcher(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
