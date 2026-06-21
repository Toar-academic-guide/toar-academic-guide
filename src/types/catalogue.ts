import type { InstitutionRecord } from '@/data/institutions';
import type { Program } from '@/data/degrees/types';
import type { FormulaType } from '@/types';

export type CatalogueSourceMode = 'auto' | 'database' | 'static';
export type CatalogueSource = 'database' | 'static';

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
  details?: string[];
}

export interface ApiMetaPayload {
  catalogueSourceMode?: CatalogueSourceMode;
  catalogueSource?: CatalogueSource;
  fallbackReason?: string;
}

export interface ApiEnvelope<T> {
  data?: T;
  error?: ApiErrorPayload;
  meta?: ApiMetaPayload;
}
