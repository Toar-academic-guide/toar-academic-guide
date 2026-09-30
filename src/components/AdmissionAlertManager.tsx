'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildAdmissionAlertIntentPath, type AdmissionAlertTarget } from '@/lib/routes';

export interface AccountAlert {
  id: string;
  institutionId: string;
  programId: string;
  cycle: string;
  status: string;
  deliveryStatus?: string | null;
  deliveryEvents?: Record<string, string> | null;
  mayStillArrive?: boolean;
}
const labels: Record<string, string> = {
  active: 'המעקב פעיל',
  needs_profile_refresh: 'המעקב הושהה — נדרש אישור פרופיל מחדש',
  pending_delivery: 'נמצא שינוי מתאים — ההתראה ממתינה לשליחה',
  notified: 'ההודעה התקבלה אצל ספק הדוא״ל',
  cancelled: 'המעקב בוטל',
  expired: 'מחזור ההתראות הסתיים',
  delivery_failed: 'שליחת ההתראה נכשלה',
};

export default function AdmissionAlertManager({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<AccountAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [support, setSupport] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    fetch('/api/admission-alerts', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((body) => {
        if (!controller.signal.aborted) {
          setAlerts(body.data);
          setSupport(body.supportEmail ?? null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
          setMessage('לא הצלחנו לטעון את ההתראות. אפשר לנסות שוב.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, reload]);
  async function act(alert: AccountAlert, method: 'DELETE' | 'POST') {
    setBusy(alert.id);
    setMessage('');
    try {
      const response = await fetch(`/api/admission-alerts/${alert.id}`, { method });
      const body = await response.json();
      if (!response.ok) throw new Error();
      const status = body.data.status;
      setMessage(
        status === 'cancelled'
          ? body.data.mayStillArrive
            ? 'המעקב בוטל. הודעה שכבר נמצאת בשליחה עדיין עשויה להגיע.'
            : 'המעקב בוטל. ההתראה הממתינה לא תישלח.'
          : status === 'retry_queued'
            ? 'ההתראה הוחזרה לתור עבור כתובת החשבון המאומתת החדשה.'
            : status === 'profile_changed'
              ? 'הפרופיל השתנה. יש לבדוק מחדש את תנאי הקבלה; ההתראה הישנה לא תישלח.'
              : 'נדרשת כתובת חשבון חדשה ומאומתת לפני ניסיון נוסף. אפשר לפנות לתמיכה.',
      );
      setReload((value) => value + 1);
    } catch {
      setMessage('לא הצלחנו לעדכן כרגע. אפשר לנסות שוב.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <section
      id="admission-alerts"
      dir="rtl"
      className="mx-auto my-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5"
      aria-labelledby="admission-alerts-heading"
    >
      <h2 id="admission-alerts-heading" className="text-xl font-bold">
        התראות שינוי קבלה
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        התראה חד־פעמית בעקבות שינוי קבלה שנבדק, ולא הבטחת קבלה. מחזור ההתראות מתחלף ב־1 באוקטובר.
      </p>
      <p role="status" className="my-3 text-sm">
        {message || (loading ? 'טוענים את ההתראות…' : '')}
      </p>
      <button
        type="button"
        onClick={() => {
          setMessage('');
          setReload((value) => value + 1);
        }}
        disabled={loading || busy !== null}
        className="mb-4 min-h-11 rounded-lg border px-4"
      >
        רענון ההתראות
      </button>
      {!loading && !loadFailed && alerts.length === 0 ? (
        <p>אין עדיין התראות. בחרו יעד, שמרו את הפרופיל ובדקו אם ניתן להפעיל מעקב.</p>
      ) : null}
      <ul className="space-y-4">
        {alerts.map((alert) => {
          const target: AdmissionAlertTarget | null =
            alert.institutionId === 'tau' && alert.programId === 'tau_cs'
              ? { institutionId: 'tau', programId: 'tau_cs' }
              : alert.institutionId === 'bgu' && alert.programId === 'bgu_cs'
                ? { institutionId: 'bgu', programId: 'bgu_cs' }
                : null;
          const uncertain = alert.deliveryStatus === 'acceptance_unknown';
          return (
            <li key={alert.id} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold">
                מדעי המחשב —{' '}
                {alert.institutionId === 'tau'
                  ? 'אוניברסיטת תל אביב'
                  : alert.institutionId === 'bgu'
                    ? 'אוניברסיטת בן־גוריון'
                    : 'מוסד אחר'}
              </h3>
              <p className="text-sm">
                מחזור {alert.cycle} · {labels[alert.status] ?? 'מצב לא זמין'}
              </p>
              {uncertain ? (
                <p className="mt-2 text-sm">
                  לא ידוע אם הספק קיבל את ההודעה. ייתכן שהיא תגיע; אין להפעיל שליחה חדשה. המצב ייבדק
                  מול הספק.
                </p>
              ) : null}
              {alert.status === 'notified' ? (
                <p className="text-sm">
                  קבלת ההודעה אצל הספק אינה אישור שהגיעה לתיבת הדואר. לא תישלח התראה נוספת למעקב זה.
                </p>
              ) : null}
              {alert.deliveryEvents?.['email.bounced'] ||
              alert.deliveryEvents?.['email.failed'] ||
              alert.deliveryEvents?.['email.suppressed'] ? (
                <p className="text-sm">
                  הספק דיווח על בעיית מסירה. פנו לתמיכה; לא נשלחת הודעה נוספת אוטומטית.
                </p>
              ) : null}
              {alert.status === 'needs_profile_refresh' && target ? (
                <Link
                  className="mt-3 inline-block min-h-11 underline"
                  href={buildAdmissionAlertIntentPath(target)}
                >
                  לבדיקת הפרופיל והחישוב מחדש, ואז אישור המעקב
                </Link>
              ) : null}
              {alert.status === 'delivery_failed' ? (
                <>
                  <p className="mt-2 text-sm">
                    יש לעדכן ולאמת את כתובת החשבון או לפנות לתמיכה. ניסיון נוסף אפשרי רק לאחר כישלון
                    ודאי ושינוי כתובת מאומת.
                  </p>
                  <button
                    type="button"
                    className="mt-3 min-h-11 rounded-lg border px-4"
                    disabled={busy !== null}
                    onClick={() => act(alert, 'POST')}
                  >
                    בדיקת כתובת מאומתת וניסיון נוסף
                  </button>
                </>
              ) : null}
              {['active', 'needs_profile_refresh', 'pending_delivery', 'delivery_failed'].includes(
                alert.status,
              ) ? (
                <button
                  type="button"
                  className="mx-2 mt-3 min-h-11 rounded-lg border border-red-200 px-4 text-red-800"
                  disabled={busy !== null}
                  onClick={() => act(alert, 'DELETE')}
                >
                  ביטול המעקב
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-4">
        <Link
          className="underline"
          href={buildAdmissionAlertIntentPath({ institutionId: 'tau', programId: 'tau_cs' })}
        >
          בדיקת מעקב לתל אביב
        </Link>
        <Link
          className="underline"
          href={buildAdmissionAlertIntentPath({ institutionId: 'bgu', programId: 'bgu_cs' })}
        >
          בדיקת מעקב לבן־גוריון
        </Link>
        {support ? (
          <a className="underline" href={`mailto:${support}`}>
            פנייה לתמיכה
          </a>
        ) : null}
      </div>
    </section>
  );
}
