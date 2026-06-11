import type { InstitutionRecord } from '@/data/institutions';
import type { Program } from '@/data/degrees/types';

export type CatalogueInstitution = Pick<
  InstitutionRecord,
  'id' | 'name' | 'region' | 'domain' | 'logoUrl' | 'programUrl' | 'calculatorUrl' | 'universityId'
>;

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
