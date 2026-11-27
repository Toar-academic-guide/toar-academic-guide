import 'server-only';
import { z } from 'zod';

const tokenSchema = z.uuid();

/** Both channels use this builder after a fresh service-role suppression check, immediately before send. */
export function buildThresholdAlertMessages(
  signup: { unsubscribeToken: string; unsubscribedAt: Date | null; notifiedAt: Date | null },
  update: { institution: string; degree: string },
) {
  if (signup.unsubscribedAt !== null || signup.notifiedAt !== null) {
    throw new Error('Threshold alert signup is inactive or already notified');
  }
  const token = tokenSchema.parse(signup.unsubscribeToken);
  const unsubscribeUrl = `https://findmyway.co.il/threshold-alerts/unsubscribe#token=${token}`;
  const text = `פורסמו תנאי הקבלה לשנת 2027: ${update.institution} — ${update.degree}.\nלפרטים: https://findmyway.co.il/programs\nלהסרה מעדכוני תנאי קבלה: ${unsubscribeUrl}`;
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );
  return {
    email: {
      subject: 'עדכון תנאי הקבלה שביקשת — MyWay',
      text,
      html: `<div lang="he" dir="rtl"><p>פורסמו תנאי הקבלה לשנת 2027: ${escape(update.institution)} — ${escape(update.degree)}.</p><p><a href="https://findmyway.co.il/programs">לפרטים</a></p><p><a href="${unsubscribeUrl}">להסרה מעדכוני תנאי קבלה</a></p></div>`,
    },
    whatsapp: { text },
  };
}
