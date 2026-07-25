import {
  createCapabilityOnlyProof,
  type AdmissionsAdapterId,
  type AdmissionsApplicantInput,
  type AdmissionsProgramInput,
  type AdmissionsProofLevel,
  type AdmissionsSourceProof,
  type AdmissionsProofStatus,
} from './admissionsSourceAdapters';
import type { FreshnessCapability } from './freshnessDiscovery';

export type AdmissionsSourceCategory =
  | 'blocked'
  | 'exact'
  | 'open_admission'
  | 'partial'
  | 'static_candidate'
  | 'manual_gate'
  | 'requirements_only';

export interface AdmissionsSourceTarget {
  id: string;
  institutionId: string;
  institutionName: string;
  officialUrl: string;
  adapterId: AdmissionsAdapterId;
  expectedCapability: FreshnessCapability;
  proofLevel: AdmissionsProofLevel;
  category: AdmissionsSourceCategory;
  defaultApplicant?: AdmissionsApplicantInput;
  defaultProgram?: AdmissionsProgramInput;
  reproducedFields: string[];
  limitations: string[];
  nextAction: string;
  blockedReason?: string;
}

export const admissionsSourceTargets: AdmissionsSourceTarget[] = [
  {
    id: 'haifa-cs-live',
    institutionId: 'haifa',
    institutionName: 'University of Haifa',
    officialUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
    adapterId: 'haifa',
    expectedCapability: 'decision_capable',
    proofLevel: 'exact_official',
    category: 'exact',
    defaultProgram: {
      targetId: 'haifa-cs-live',
      id: 'haifa-cs',
      name: 'Computer Science',
      externalId: '52258372',
    },
    reproducedFields: ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff'],
    limitations: ['Representative program only; broad Haifa program coverage is deferred'],
    nextAction: 'Promote to first weekly GitHub Action adapter candidate',
  },
  {
    id: 'tau-digital-sciences-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    expectedCapability: 'decision_capable',
    proofLevel: 'exact_official',
    category: 'exact',
    defaultProgram: {
      targetId: 'tau-digital-sciences-live',
      pairId: 'tau_datascience__tau',
      id: 'tau-digital-sciences',
      name: 'Digital Sciences for High-Tech',
      externalId: '056011050000',
      searchText: 'מדעים דיגיטליים',
      scoreField: 'hatama_handasa',
    },
    reproducedFields: ['selectedScore', 'acceptanceThreshold', 'rejectionThreshold'],
    limitations: ['Representative program only; faculty score-field mapping needs expansion'],
    nextAction: 'Promote to second weekly GitHub Action adapter candidate',
  },
  {
    id: 'tau-nursing-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    expectedCapability: 'decision_capable',
    proofLevel: 'exact_official',
    category: 'exact',
    defaultApplicant: {
      bagrutAverage: 100,
      psychometric: 520,
    },
    defaultProgram: {
      targetId: 'tau-nursing-live',
      pairId: 'nursing__tau',
      id: 'tau-nursing',
      name: 'Nursing',
      externalId: '016211010000',
      searchText: 'nursing',
      scoreField: 'hatama',
    },
    reproducedFields: [
      'selectedScore',
      'acceptanceThreshold',
      'rejectionThreshold',
      'officialVerdict',
    ],
    limitations: [
      'The numeric result is eligibility for the mandatory suitability assessment, not final admission.',
    ],
    nextAction: 'Keep the suitability assessment and possible interview visible as manual gates.',
  },
  {
    id: 'tau-psychology-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    expectedCapability: 'decision_capable',
    proofLevel: 'exact_official',
    category: 'exact',
    defaultApplicant: {
      bagrutAverage: 110,
      psychometric: 680,
    },
    defaultProgram: {
      targetId: 'tau-psychology-live',
      pairId: 'tau_psychology__tau',
      id: 'tau-psychology',
      name: 'Psychology',
      nodeId: 8275,
      externalId: '107111050000',
      scoreField: 'hatama',
    },
    reproducedFields: [
      'selectedScore',
      'acceptanceThreshold',
      'rejectionThreshold',
      'officialVerdict',
    ],
    limitations: ['The proof covers the standard combined Bagrut and psychometric score route.'],
    nextAction: 'Keep the programme node, score field, cycle gates, and fixtures under review.',
  },
  {
    id: 'tau-social-work-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    expectedCapability: 'decision_capable',
    proofLevel: 'exact_official',
    category: 'exact',
    defaultApplicant: {
      bagrutAverage: 110,
      psychometric: 680,
    },
    defaultProgram: {
      targetId: 'tau-social-work-live',
      pairId: 'social_work__tau',
      id: 'tau-social-work',
      name: 'Social Work',
      nodeId: 8299,
      externalId: '111011010000',
      scoreField: 'hatama',
    },
    reproducedFields: [
      'selectedScore',
      'acceptanceThreshold',
      'rejectionThreshold',
      'officialVerdict',
    ],
    limitations: [
      'The official page retains the registration-priority, online-course, and possible-interview conditions outside the standard score replay.',
    ],
    nextAction:
      'Keep the node mapping, score route, and non-score admissions conditions under review.',
  },
  {
    id: 'tau-social-work-legacy-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    expectedCapability: 'decision_capable',
    proofLevel: 'exact_official',
    category: 'exact',
    defaultApplicant: {
      bagrutAverage: 110,
      psychometric: 680,
    },
    defaultProgram: {
      targetId: 'tau-social-work-legacy-live',
      pairId: 'tau_socialwork__tau',
      id: 'tau-social-work',
      name: 'Social Work',
      nodeId: 8299,
      externalId: '111011010000',
      scoreField: 'hatama',
    },
    reproducedFields: [
      'selectedScore',
      'acceptanceThreshold',
      'rejectionThreshold',
      'officialVerdict',
    ],
    limitations: [
      'This alias uses the same official programme source as Social Work; its historical catalogue cutoff is not authoritative.',
    ],
    nextAction:
      'Keep the shared programme mapping and non-score admissions conditions under review.',
  },
  {
    id: 'huji-static-json',
    institutionId: 'huji',
    institutionName: 'Hebrew University',
    officialUrl: 'https://go.huji.ac.il/jjson/huji.json.gz',
    adapterId: 'capability_matrix',
    expectedCapability: 'decision_capable',
    proofLevel: 'static_data_candidate',
    category: 'static_candidate',
    reproducedFields: ['programCutoffCandidate'],
    limitations: [
      'Requires reproducing static JSON plus bundled client-side JS before exact proof',
    ],
    nextAction: 'Run a separate HUJI static JSON and bundled-JS reproduction spike',
  },
  {
    id: 'technion-score-only',
    institutionId: 'technion',
    institutionName: 'Technion',
    officialUrl:
      'https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php',
    adapterId: 'technion',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['sekhemScore', 'optimalBagrutAverage'],
    limitations: [
      'Calculator response can produce score fields, but proof has no official thresholds',
    ],
    nextAction: 'Pair calculator output with a reviewed official threshold source',
  },
  {
    id: 'bgu-score-only',
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: 'https://bgu4u.bgu.ac.il/html/average_calc/index.php',
    adapterId: 'bgu',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['sekhemScore'],
    limitations: [
      'Known endpoints calculate scores, but status and cutoffs were not returned in the proof notes',
    ],
    nextAction: 'Find or review an official cutoff/status source before product decisions',
  },
  {
    id: 'biu-browser-required',
    institutionId: 'biu',
    institutionName: 'Bar-Ilan University',
    officialUrl: 'https://in.biu.ac.il/Pages/Psychometric.aspx',
    adapterId: 'capability_matrix',
    expectedCapability: 'blocked',
    proofLevel: 'blocked',
    category: 'blocked',
    reproducedFields: [],
    limitations: [
      'ASP.NET AJAX view state, Radware cookies, and browser session state are required',
    ],
    nextAction: 'Move to Hermes/VPS browser automation lane',
    blockedReason: 'Radware/browser session required',
  },
  {
    id: 'ariel-browser-required',
    institutionId: 'ariel',
    institutionName: 'Ariel University',
    officialUrl: 'https://www.ariel.ac.il/wp/',
    adapterId: 'capability_matrix',
    expectedCapability: 'blocked',
    proofLevel: 'blocked',
    category: 'blocked',
    reproducedFields: [],
    limitations: [
      'Stateful two-step flow, Windows-1255 encoding, and Radware browser state are required',
    ],
    nextAction: 'Move to Hermes/VPS browser automation lane',
    blockedReason: 'Stateful browser session required',
  },
  {
    id: 'openu-open-admission',
    institutionId: 'open_university',
    institutionName: 'Open University',
    officialUrl: 'https://www.openu.ac.il/',
    adapterId: 'capability_matrix',
    expectedCapability: 'decision_capable',
    proofLevel: 'open_admission',
    category: 'open_admission',
    reproducedFields: ['openAdmissionPolicy'],
    limitations: ['No sekhem calculator is required for the open-admission baseline'],
    nextAction: 'Represent as open-admission policy rather than calculator reproduction',
  },
  {
    id: 'reichman-client-formula',
    institutionId: 'reichman',
    institutionName: 'Reichman University',
    officialUrl: 'https://www.runi.ac.il/admissions/undergraduate/calculator',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['adaptedScore'],
    limitations: [
      'Client-side ASP.NET WebForms calculator; adapted score formula reverse-engineered but no live threshold endpoint',
    ],
    nextAction:
      'Pair reviewed adapted-score formula with reviewed program thresholds for estimated results',
  },
  {
    id: 'afeka-client-formula',
    institutionId: 'afeka',
    institutionName: 'Afeka College of Engineering',
    officialUrl: 'https://www.afeka.ac.il/candidate/candidate-information-bsc/calculator/',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['sekhemScore', 'subjectGates'],
    limitations: [
      'Client-side multi-step wizard; subject gates require math/English/physics/CS inputs that the landing page may not collect',
    ],
    nextAction:
      'Collect missing subject inputs or emit needs-input when required fields are absent',
  },
  {
    id: 'hit-client-formula',
    institutionId: 'hit',
    institutionName: 'HIT - Holon Institute of Technology',
    officialUrl: 'https://calc.hit.ac.il/',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['bagrutAverage', 'departmentGates'],
    limitations: [
      'Client-side Bagrut optimizer with department-specific numeric gates for engineering programs; design programs are manual-gate',
    ],
    nextAction:
      'Use minimum-floor estimation for engineering programs; manual-gate for design programs',
  },
  {
    id: 'shenkar-bagrut-helper',
    institutionId: 'shenkar',
    institutionName: 'Shenkar - Engineering. Design. Art',
    officialUrl: 'https://www.shenkar.ac.il/he/pages/calc/',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'manual_gate',
    reproducedFields: ['bagrutAverage'],
    limitations: [
      'Calculator is a Bagrut-average helper only; no combined psychometric formula exists; design/art departments require portfolio, exam, and interview gates',
    ],
    nextAction: 'Represent as manual-gate evidence; do not model as a normal sekhem calculator',
  },
  {
    id: 'mta-requirements-only',
    institutionId: 'mta',
    institutionName: 'MTA - Academic College of Tel Aviv-Yaffo',
    officialUrl: 'https://www.mta.ac.il/conditions_for_applying',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'requirements_only',
    reproducedFields: [],
    limitations: [
      'No reverse-engineered calculator formula; only requirements enrichment data is available; a secondary calculator link exists but has not been parsed',
    ],
    nextAction: 'Reverse-engineer the secondary calculator link or represent as requirements-only',
  },
];

export function selectAdmissionsSourceTargets(targetIds?: string[]): AdmissionsSourceTarget[] {
  if (!targetIds || targetIds.length === 0) {
    return admissionsSourceTargets.filter((target) => target.category === 'exact');
  }

  const requested = new Set(targetIds);
  return admissionsSourceTargets.filter((target) => requested.has(target.id));
}

export function buildCapabilityMatrixProof(target: AdmissionsSourceTarget): AdmissionsSourceProof {
  const status = statusForTarget(target);

  return createCapabilityOnlyProof({
    id: target.id,
    institutionId: target.institutionId,
    institutionName: target.institutionName,
    officialUrl: target.officialUrl,
    capability: target.expectedCapability,
    proofLevel: target.proofLevel,
    status,
    reproducedFields: target.reproducedFields,
    normalizedPayload: normalizedPayloadForTarget(target),
    limitations: target.limitations,
    nextAction: target.nextAction,
    blockedReason: target.blockedReason,
  });
}

function statusForTarget(target: AdmissionsSourceTarget): AdmissionsProofStatus {
  if (target.category === 'blocked') {
    return 'blocked';
  }

  if (
    target.category === 'partial' ||
    target.category === 'static_candidate' ||
    target.category === 'manual_gate' ||
    target.category === 'requirements_only'
  ) {
    return 'partial';
  }

  return 'succeeded';
}

function normalizedPayloadForTarget(target: AdmissionsSourceTarget): Record<string, unknown> {
  if (target.category === 'open_admission') {
    return {
      openAdmissionPolicy: true,
      requirement: 'Open admission baseline; no sekhem calculator required',
    };
  }

  if (target.category === 'blocked') {
    return {
      reason: target.blockedReason,
      limitations: target.limitations,
    };
  }

  if (target.category === 'manual_gate' || target.category === 'requirements_only') {
    return {
      limitations: target.limitations,
      nextAction: target.nextAction,
    };
  }

  return {
    proofLevel: target.proofLevel,
    reproducedFields: target.reproducedFields,
    limitations: target.limitations,
  };
}
