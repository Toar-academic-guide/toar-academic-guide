import { describe, expect, it } from 'vitest';
import { buildCalculatorShare, calculatorShare } from './calculatorShare';

describe('calculator result sharing', () => {
  it.each(['journey_calculator', 'sekhem_calculator'] as const)(
    'keeps %s on the public calculator without personal data',
    (surface) => {
      const share = calculatorShare(surface);
      const url = new URL(share.url);
      expect(url.origin).toBe('https://findmyway.co.il');
      expect(url.pathname).toBe(
        surface === 'journey_calculator' ? '/app/calculator' : '/sekhem-calculator',
      );
      expect(url.search).toBe('');
      expect(url.hash).toBe('');
      expect(share.text.startsWith(share.message)).toBe(true);
      expect(share.text).toContain(share.url);
      expect(share.whatsappUrl).toBe(`https://wa.me/?text=${encodeURIComponent(share.text)}`);
      expect(new URL(share.whatsappUrl).searchParams.get('text')).toBe(share.text);
      expect(share.text).not.toMatch(/\d{2,}/);
    },
  );

  it('drops scores and steps even if a caller passes the current address', () => {
    const share = buildCalculatorShare({
      title: 'מחשבון',
      message: 'בדקתי את סיכויי הקבלה שלי ב-MyWay. אפשר לבדוק גם:',
      url: 'https://findmyway.co.il/app/calculator?bagrut=95&psychometric=700&program=tau_cs#results',
    });
    expect(share.url).toBe('https://findmyway.co.il/app/calculator');
    expect(share.text).not.toContain('95');
    expect(share.text).not.toContain('700');
    expect(share.text).not.toContain('tau_cs');
    expect(share.text).not.toContain('#results');
  });
});
