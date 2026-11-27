import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

/** Standalone response: the fragment credential never reaches app analytics, auth, or GET logs. */
export function GET() {
  const nonce = randomBytes(24).toString('base64');
  return new Response(
    `<!doctype html><html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>הסרה מעדכוני תנאי קבלה — MyWay</title>
<style nonce="${nonce}">body{margin:0;background:#f4f5f8;color:#222338;font-family:Arial,sans-serif;line-height:1.8;text-align:right}main{max-width:480px;margin:48px auto;padding:28px;background:white;border-radius:16px}h1{font-size:24px}button,a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;font-size:16px}button{border:0;border-radius:8px;background:#4f46e5;color:white;padding:0 20px;cursor:pointer}a{color:#3730a3}[hidden]{display:none}button:focus-visible,a:focus-visible{outline:3px solid #6366f1;outline-offset:3px}@media(max-width:540px){main{margin:24px 12px}}</style></head>
<body><main><h1>הסרה מעדכוני תנאי קבלה</h1>
<p id="status" role="status" aria-live="polite">מבטלים את העדכונים…</p>
<button id="retry" type="button" hidden>לנסות שוב</button>
<p><a href="/">לעמוד הבית</a></p>
<noscript>יש לאפשר JavaScript כדי להסיר את ההרשמה, או לפנות ל-info@findmyway.co.il.</noscript>
</main><script nonce="${nonce}">
const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname);
const status = document.getElementById('status');
const retry = document.getElementById('retry');
async function unsubscribe() {
  retry.hidden = true;
  status.textContent = 'מבטלים את העדכונים…';
  try {
    const response = await fetch('/api/threshold-alerts/unsubscribe', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    if (response.status === 400 || response.status === 410) {status.textContent = 'הקישור אינו תקין. אפשר לבקש הסרה ב-info@findmyway.co.il.';return;}
    if (!response.ok) throw new Error('Unsubscribe failed');
    status.textContent = 'הוסרת מעדכוני תנאי הקבלה לשנת 2027. לא נשלח עדכונים נוספים להרשמה הזו.';
  } catch {status.textContent = 'לא הצלחנו להסיר כרגע. אפשר לנסות שוב או לפנות ל-info@findmyway.co.il.';retry.hidden = false;}
}
retry.addEventListener('click', unsubscribe);
if (token && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) unsubscribe();
else status.textContent = 'הקישור אינו תקין. אפשר לבקש הסרה ב-info@findmyway.co.il.';
</script></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
      },
    },
  );
}
