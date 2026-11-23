import { absoluteUrl } from '@/lib/site';

export type CalculatorShareSurface = 'journey_calculator' | 'sekhem_calculator';

const shares = {
  journey_calculator: {
    title: 'מחשבון סיכויי קבלה | MyWay',
    message: 'בדקתי את סיכויי הקבלה שלי ב-MyWay. אפשר לבדוק גם:',
    url: absoluteUrl('/app/calculator'),
  },
  sekhem_calculator: {
    title: 'מחשבון סכם וממוצע בגרות | MyWay',
    message: 'חישבתי סכם וממוצע בגרות ב-MyWay. אפשר לחשב גם:',
    url: absoluteUrl('/sekhem-calculator'),
  },
} as const;

export function buildCalculatorShare(input: { title: string; message: string; url: string }) {
  const url = new URL(input.url);
  url.search = '';
  url.hash = '';
  const clean = url.toString();
  const text = `${input.message} ${clean}`;
  return {
    title: input.title,
    message: input.message,
    url: clean,
    text,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
}

export function calculatorShare(surface: CalculatorShareSurface) {
  return buildCalculatorShare(shares[surface]);
}
