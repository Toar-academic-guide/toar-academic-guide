import {
  createCapabilityOnlyProof,
  type AdmissionsAdapterId,
  type AdmissionsProgramInput,
  type AdmissionsProofLevel,
  type AdmissionsSourceProof,
} from './admissionsSourceAdapters';
import type { FreshnessCapability } from './freshnessDiscovery';

export type AdmissionsSourceCategory =
  | 'blocked'
  | 'exact'
  | 'open_admission'
  | 'partial'
  | 'static_candidate';

export interface AdmissionsSourceTarget {
  id: string;
  institutionId: string;
  institutionName: string;
  officialUrl: string;
  adapterId: AdmissionsAdapterId;
  expectedCapability: FreshnessCapability;
  proofLevel: AdmissionsProofLevel;
  category: AdmissionsSourceCategory;
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
    id: 'huji-static-json',
    institutionId: 'huji',
    institutionName: 'Hebrew University',
    officialUrl: 'https://go.huji.ac.il/jjson/huji.json.gz',
    adapterId: 'capability_matrix',
    expectedCapability: 'decision_capable',
    proofLevel: 'static_data_candidate',
    category: 'static_candidate',
    reproducedFields: ['programCutoffCandidate'],
    limitations: ['Requires reproducing static JSON plus bundled client-side JS before exact proof'],
    nextAction: 'Run a separate HUJI static JSON and bundled-JS reproduction spike',
  },
  {
    id: 'technion-score-only',
    institutionId: 'technion',
    institutionName: 'Technion',
    officialUrl:
      'https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['sekhemScore', 'optimalBagrutAverage'],
    limitations: ['Calculator response can produce score fields, but proof has no official thresholds'],
    nextAction: 'Pair calculator output with a reviewed official threshold source',
  },
  {
    id: 'bgu-score-only',
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: 'https://in.bgu.ac.il/Pages/default.aspx',
    adapterId: 'capability_matrix',
    expectedCapability: 'score_only',
    proofLevel: 'partial_official',
    category: 'partial',
    reproducedFields: ['sekhemScore'],
    limitations: ['Known endpoints calculate scores, but status and cutoffs were not returned in the proof notes'],
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
    limitations: ['ASP.NET AJAX view state, Radware cookies, and browser session state are required'],
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
    limitations: ['Stateful two-step flow, Windows-1255 encoding, and Radware browser state are required'],
    nextAction: 'Move to Hermes/VPS browser automation lane',
    blockedReason: 'Stateful browser session required',
  },
  {
    id: 'openu-open-admission',
    institutionId: 'openu',
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

function statusForTarget(target: AdmissionsSourceTarget): AdmissionsSourceProof['status'] {
  if (target.category === 'blocked') {
    return 'blocked';
  }

  if (target.category === 'partial' || target.category === 'static_candidate') {
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
    };
  }

  return {
    proofLevel: target.proofLevel,
    reproducedFields: target.reproducedFields,
    limitations: target.limitations,
  };
}
