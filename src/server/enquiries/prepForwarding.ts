import 'server-only';
import { ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';

// Future prep delivery must use the persisted record, not an incoming request.
export function canForwardToPrep(storedLead: {
  prep_consent?: boolean;
  prep_consent_text?: string | null;
}): boolean {
  return storedLead.prep_consent === true && storedLead.prep_consent_text === ENQUIRY_PREP_CONSENT;
}
