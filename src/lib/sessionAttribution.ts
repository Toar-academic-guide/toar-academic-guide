import { enquiryAttributionSchema, type EnquiryAttribution } from './leadAttribution';

const STORAGE_KEY = 'myway_lead_attribution_v1';
let memoryFirstTouch: EnquiryAttribution | undefined;

function captureFirstTouch(): EnquiryAttribution {
  const params = new URLSearchParams(window.location.search);
  const candidates = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    referrer: document.referrer,
  };
  return Object.fromEntries(
    Object.entries(candidates).flatMap(([key, value]) => {
      const field = key as keyof EnquiryAttribution;
      const parsed = enquiryAttributionSchema.shape[field].safeParse(value);
      return parsed.success && parsed.data ? [[field, parsed.data]] : [];
    }),
  );
}

function parseStoredAttribution(stored: string): EnquiryAttribution {
  try {
    const parsed = enquiryAttributionSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function getSessionAttribution(): EnquiryAttribution {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) return parseStoredAttribution(stored);
    const firstTouch = captureFirstTouch();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(firstTouch));
    return firstTouch;
  } catch {
    // Embedded browsers may deny storage; retain first touch until this document unloads.
    memoryFirstTouch ??= captureFirstTouch();
    return memoryFirstTouch;
  }
}
