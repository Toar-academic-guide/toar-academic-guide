import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';
/** A standalone page deliberately excludes app analytics/auth scripts from this token-bearing URL. */
export function GET() {
  const nonce = randomBytes(24).toString('base64');
  return new Response(
    `<!doctype html><html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>הסרה מהתראות קבלה — MyWay</title>
<style nonce="${nonce}">body{margin:0;background:#f4f5f8;color:#222338;font-family:Arial,sans-serif;line-height:1.8}main{max-width:480px;margin:48px auto;padding:28px;background:white;border-radius:16px}h1{font-size:24px}button{border:0;border-radius:8px;background:#4f46e5;color:white;font-size:16px;padding:12px 20px;cursor:pointer}button:disabled{opacity:.6;cursor:default}a{color:#3730a3}@media(max-width:540px){main{margin:24px 12px}}</style></head>
<body><main><h1>הסרה מהתראות שינוי קבלה</h1>
<p>הלחיצה תבטל את התראות שינוי הקבלה ואת המעקבים הפעילים שלך. אפשר להפעיל אותם מחדש במפורש דרך החשבון.</p>
<p id="status" role="status" aria-live="polite"></p>
<button id="unsubscribe" type="button" disabled>הסרה מכל התראות הקבלה</button>
<p><a href="/app/profile#admission-alerts">לניהול ההתראות בחשבון</a></p>
<noscript>יש לאפשר JavaScript כדי להשתמש בקישור. אפשר גם לבטל את ההתראות דרך החשבון.</noscript>
</main><script nonce="${nonce}">
const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname);
const button = document.getElementById('unsubscribe');
const status = document.getElementById('status');
if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) button.disabled = false;
else status.textContent = 'הקישור אינו תקין. אפשר לנהל את ההתראות דרך החשבון.';
button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'מבטלים את ההתראות…';
  try {
    const response = await fetch('/api/admission-alerts/unsubscribe', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),credentials:'omit',referrerPolicy:'no-referrer'});
    if (response.status === 410) {status.textContent = 'הקישור פג תוקף או אינו תקין. אפשר לנהל את ההתראות דרך החשבון.';return;}
    if (!response.ok) throw new Error('Unsubscribe failed');
    const result = await response.json();
    status.textContent = result.data.mayStillArrive ? 'התראות הקבלה בוטלו. הודעה שכבר נשלחה או נמצאת בשליחה עדיין עשויה להגיע.' : 'התראות הקבלה בוטלו. לא יישלחו התראות נוספות ללא הפעלה מחדש.';
    button.hidden = true;
  } catch {status.textContent = 'לא הצלחנו לבטל כרגע. אפשר לנסות שוב או לנהל את ההתראות דרך החשבון.';button.disabled = false;}
});</script></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
      },
    },
  );
}
