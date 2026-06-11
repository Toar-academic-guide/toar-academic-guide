export type ReviewItemStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewItemDescriptor {
  id: string;
  payloadId: string;
  admissionRequirementId?: string;
  targetField: string;
  proposedValue: unknown;
  status: ReviewItemStatus;
}
