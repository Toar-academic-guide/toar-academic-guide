/**
 * CONFIG HOOK: outbound WhatsApp for the enquiry step.
 *
 * Set NEXT_PUBLIC_WHATSAPP_E164 to an approved number (digits, country code
 * included, leading + optional). The link stays hidden until that variable is
 * set. Do not fall back to the privacy-page telephone — that number is Amit's
 * privacy contact, not a student WhatsApp line.
 */
export function enquiryWhatsAppHref(subject?: string): string | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_E164 ?? '').replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  const topic = subject?.trim();
  const text = topic ? `?text=${encodeURIComponent(`שלום, אשמח לפרטים על ${topic}`)}` : '';
  return `https://wa.me/${digits}${text}`;
}
