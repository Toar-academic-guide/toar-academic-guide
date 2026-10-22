// In these catalogue/subject words, ה is part of the word, not the definite article.
const LEXICAL_HE_WORDS = new Set([
  'הנדסה',
  'הנדסת',
  'הנדסאים',
  'היסטוריה',
  'הסטוריה',
  'הבעה',
  'הולנדית',
  'הונגרית',
  'הגנת',
  'הדפסת',
  'הפקות',
  'השפעה',
]);

export function withBet(name: string): string {
  const hasArticle = name.startsWith('ה') && !LEXICAL_HE_WORDS.has(name.split(' ')[0]);
  return `ב${hasArticle ? name.slice(1) : name}`;
}
