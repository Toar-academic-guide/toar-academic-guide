import 'server-only';

export type AdmissionRouteCapabilityStatus = 'enabled' | 'disabled' | 'unsupported';

export interface AdmissionRouteCapability {
  programId: string;
  status: AdmissionRouteCapabilityStatus;
  verificationMode?: 'official_finalist_replay' | 'fixture_backed_local_formula';
  supportedActionKinds: Array<'psychometric' | 'improve_grade' | 'expand_units' | 'add_subject'>;
  requiredInputs: string[];
  missingCapabilities: string[];
  sourceUrls: string[];
}

const ROUTE_CAPABILITIES: Record<string, AdmissionRouteCapability> = {
  tau_cs: {
    programId: 'tau_cs',
    status: 'enabled',
    verificationMode: 'official_finalist_replay',
    supportedActionKinds: ['psychometric'],
    requiredInputs: ['psychometric', 'tau_bagrut_average', 'structured_bagrut_subjects'],
    missingCapabilities: ['academic_action_bagrut_recomputation'],
    sourceUrls: ['https://go.tau.ac.il/graphql', 'https://go.tau.ac.il/he/exact/ba/computer'],
  },
  bgu_cs: {
    programId: 'bgu_cs',
    status: 'disabled',
    verificationMode: 'official_finalist_replay',
    supportedActionKinds: [],
    requiredInputs: [
      'psychometric',
      'psychometric_component_scores',
      'bgu_bagrut_average',
      'structured_bagrut_subjects',
      'language_classifications',
    ],
    missingCapabilities: [
      'academic_action_bagrut_recomputation',
      'psychometric_action_component_projection',
    ],
    sourceUrls: [
      'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4',
      'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1',
    ],
  },
};

export function getAdmissionRouteCapability(programId: string): AdmissionRouteCapability {
  return (
    ROUTE_CAPABILITIES[programId] ?? {
      programId,
      status: 'unsupported',
      supportedActionKinds: [],
      requiredInputs: [],
      missingCapabilities: ['reviewed_route_capability'],
      sourceUrls: [],
    }
  );
}

export function listAdmissionRouteCapabilities() {
  return Object.values(ROUTE_CAPABILITIES);
}
