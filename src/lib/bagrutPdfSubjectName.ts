export const normalizeBagrutPdfSubject = (value: string) =>
  value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/["׳״']/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
