export const SITE_URL = 'https://findmyway.co.il';
export const SITE_NAME = 'MyWay';
export const SITE_ALT_NAMES = ['FindMyWay', 'Way', 'findmyway.co.il'];
export const SITE_DESCRIPTION =
  'MyWay עוזרת לבחור מה ואיפה ללמוד: תארים, קורסים, לימודי תעודה ותוכניות בינלאומיות. שאלון התאמה, קטלוג מוסדות ומסלולים ובדיקת סיכויי קבלה אישית — בחינם.';

export function absoluteUrl(path = '/'): string {
  const pathname = path.replace(/^\/+|\/+$/g, '');
  return pathname ? `${SITE_URL}/${pathname}` : `${SITE_URL}/`;
}
