import 'server-only';

import { render, toPlainText } from '@react-email/render';
import type { AdmissionAlertMailPayload } from './deliveryWorker';

export interface AdmissionAlertEmailConfig {
  origin: string;
  from: string;
  supportEmail: string;
}

const mailbox = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

/** Sender domain verification is enforced by Resend, not by this syntax check. */
export function readAdmissionAlertEmailConfig(
  env: Record<string, string | undefined>,
): AdmissionAlertEmailConfig {
  const from = env.ADMISSION_ALERT_FROM_EMAIL?.trim() ?? '';
  const supportEmail = env.ADMISSION_ALERT_SUPPORT_EMAIL?.trim() ?? '';
  if (!mailbox.test(from) || !mailbox.test(supportEmail)) {
    throw new Error('Admission-alert sender and support email configuration is required.');
  }
  let origin: URL;
  try {
    origin = new URL(env.ADMISSION_ALERT_APP_ORIGIN ?? '');
  } catch {
    throw new Error('Admission-alert HTTPS application origin is required.');
  }
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('Admission-alert HTTPS application origin is required.');
  }
  return { origin: origin.origin, from, supportEmail };
}

export interface AdmissionAlertEmailContent {
  /** Supplied by the server's verified-account lookup, never by the subscribe request. */
  recipient: string;
  institutionName: string;
  programName: string;
  reviewedAt: Date;
  cycle: string;
  unsubscribeToken: string;
}

/** Only public programme context belongs here: do not pass profiles or evaluator results. */
export async function renderAdmissionAlertEmail(
  content: AdmissionAlertEmailContent,
  config: AdmissionAlertEmailConfig,
): Promise<AdmissionAlertMailPayload> {
  if (
    !mailbox.test(content.recipient) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(content.unsubscribeToken)
  ) {
    throw new Error('Admission-alert delivery context is invalid.');
  }
  const reviewedDate = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(content.reviewedAt);
  const calculateUrl = `${config.origin}/app/calculator`;
  const manageUrl = `${config.origin}/app/profile#admission-alerts`;
  // A fragment is not sent in HTTP requests/access logs. U6 handles explicit confirmation.
  const unsubscribeUrl = `${config.origin}/admission-alerts/unsubscribe#token=${content.unsubscribeToken}`;
  const html = await render(
    <html lang="he" dir="rtl">
      {/* This is a standalone email document, not a Next.js page. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          backgroundColor: '#f4f5f8',
          color: '#222338',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              <td align="center" style={{ padding: '24px 12px' }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{ maxWidth: 560, backgroundColor: '#ffffff', borderRadius: 16 }}
                >
                  <tbody>
                    <tr>
                      <td
                        dir="rtl"
                        style={{ padding: '28px 24px', textAlign: 'right', lineHeight: 1.8 }}
                      >
                        <p
                          style={{
                            margin: '0 0 20px',
                            color: '#4f46e5',
                            fontSize: 20,
                            fontWeight: 700,
                          }}
                        >
                          MyWay
                        </p>
                        <h1 style={{ margin: '0 0 16px', fontSize: 24, lineHeight: 1.5 }}>
                          יש עדכון במסלול שבחרת
                        </h1>
                        <p>
                          ייתכן שהמסלול שבחרת נמצא כעת בהישג יד:{' '}
                          <strong>{content.programName}</strong> ב{content.institutionName}.
                        </p>
                        <p>
                          בעקבות שינוי בנתוני הקבלה שנבדק בתאריך {reviewedDate}, זוהתה התאמה ראשונית
                          חדשה ליעד שביקשת לעקוב אחריו במחזור ההתראות {content.cycle}.
                        </p>
                        <p>
                          ההתראה אינה הבטחת קבלה. תנאי הקבלה עשויים להשתנות, וייתכנו דרישות נוספות.
                          כדאי לבצע חישוב עדכני ולבדוק את התנאים הרשמיים באתר המוסד.
                        </p>
                        <p style={{ margin: '28px 0' }}>
                          <a
                            href={calculateUrl}
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              borderRadius: 8,
                              padding: '12px 20px',
                              textDecoration: 'none',
                              fontWeight: 700,
                            }}
                          >
                            לחישוב עדכני
                          </a>
                        </p>
                        <hr style={{ border: 0, borderTop: '1px solid #e3e5ed' }} />
                        <p style={{ fontSize: 14 }}>
                          קיבלת את ההודעה כי ביקשת התראת שינוי קבלה למסלול הזה. לא נשלחו בה ציונים
                          או נתוני לימודים אישיים.
                        </p>
                        <p style={{ fontSize: 14 }}>
                          <a href={manageUrl} style={{ color: '#3730a3' }}>
                            ניהול ההתראות שלי
                          </a>
                        </p>
                        <p style={{ fontSize: 14 }}>
                          <a href={unsubscribeUrl} style={{ color: '#3730a3' }}>
                            הסרה מכל התראות שינוי הקבלה
                          </a>
                        </p>
                        <p style={{ fontSize: 14 }}>
                          לשאלות ולעזרה:{' '}
                          <a
                            href={`mailto:${config.supportEmail}`}
                            dir="ltr"
                            style={{ color: '#3730a3' }}
                          >
                            {config.supportEmail}
                          </a>
                          . אפשר גם להשיב להודעה הזו.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>,
  );
  return {
    from: config.from,
    to: content.recipient,
    subject: 'MyWay — יש עדכון במסלול שבחרת',
    html,
    text: toPlainText(html),
    reply_to: config.supportEmail,
  };
}
