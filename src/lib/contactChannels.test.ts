import { afterEach, describe, expect, it, vi } from 'vitest';
import { enquiryWhatsAppHref } from './contactChannels';

describe('enquiry WhatsApp config hook', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays unset until NEXT_PUBLIC_WHATSAPP_E164 is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_E164', '');
    expect(enquiryWhatsAppHref('מדעי המחשב')).toBeNull();
  });

  it('does not borrow the privacy-page telephone', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_E164', '');
    expect(enquiryWhatsAppHref()).toBeNull();
    expect(JSON.stringify(enquiryWhatsAppHref('פרטיות'))).not.toContain('528464129');
  });

  it('builds a wa.me link from a configured E.164 number without personal details', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_E164', '+972501111111');
    expect(enquiryWhatsAppHref('מדעי המחשב · אוניברסיטת תל אביב')).toBe(
      'https://wa.me/972501111111?text=' +
        encodeURIComponent('שלום, אשמח לפרטים על מדעי המחשב · אוניברסיטת תל אביב'),
    );
  });
});
