import type { InstitutionRecord } from '@/data/institutions';
import type { Program } from '@/data/degrees/types';
import type { FormulaType } from '@/types';

export interface CatalogueCalculatorConfig {
  formulaType: FormulaType;
  scaleDescription: string;
  sekhemWeight?: {
    psy: number;
    bag: number;
  };
}

export interface CatalogueInstitution
  extends Pick<
    InstitutionRecord,
    'id' | 'name' | 'region' | 'domain' | 'logoUrl' | 'programUrl' | 'calculatorUrl' | 'universityId'
  > {
  calculatorConfig?: CatalogueCalculatorConfig;
}

export interface CatalogueProgram extends Program {
  linkedInstitutionIds: string[];
}

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  data?: T;
  error?: ApiErrorPayload;
}
