# Threshold publication signups

Students can ask MyWay to tell them when selected institutions publish admission
thresholds (תנאי קבלה / סכם) for the 2027 cycle. The public page is
`/threshold-alerts`. It is indexable. `/admission-alerts/` stays disallowed for
crawlers because that path is the account unsubscribe flow for a different
product.

This list is not an Admission Change Subscription. Those subscriptions belong to
a signed-in student, use a saved academic profile, and email only when TAU or
BGU computer science becomes newly eligible. Do not copy these rows into
`enquiries`, Monday, or the prep-company consent fields.

## What is stored

`public.threshold_alert_signups` is insert-only for `app_runtime` through
`public.store_threshold_alert_signup(jsonb)`. Row level security is on and there
is no select policy. `anon`, `authenticated`, `app_runtime`, `ops_readonly`, and
`admissions_automation` cannot read the table. Export uses the Supabase SQL
editor with `service_role`.

A row needs the exact alert consent text, cycle `2027`, at least one allowlisted
institution or degree, and an email and/or an Israeli mobile stored as E.164
(`+9725XXXXXXXX`). `notified_at` stays null until a later send marks it.

The same `request_id` is ignored on retry. A person who submits again gets
another row. Dedupe on export.

## Export

```sql
select
  request_id,
  created_at,
  cycle,
  email,
  phone,
  institutions,
  degrees,
  source_path,
  utm_source,
  utm_medium,
  utm_campaign,
  referrer
from public.threshold_alert_signups
where cycle = '2027'
  and notified_at is null
order by created_at;
```

Group a send by institution and degree. One person who selected Tel Aviv and
computer science should receive one message, not one per checkbox.

Suggested dedupe before a send:

```sql
select distinct on (coalesce(email, ''), coalesce(phone, ''))
  email,
  phone,
  institutions,
  degrees
from public.threshold_alert_signups
where cycle = '2027'
  and notified_at is null
order by coalesce(email, ''), coalesce(phone, ''), created_at desc;
```

After a real send, set `notified_at` for the included request ids. Nothing in
the app does that yet.

## Sending later

Email can reuse the existing Resend setup (`ADMISSION_ALERT_FROM_EMAIL` on a
verified domain) with a new template. The template may name the institution,
degree, cycle, and a link back to the calculator. It must not include grades.
WhatsApp has no provider in this repo. Do not send from a personal number, and
do not turn the stored phone into an enquiry or a prep-company lead.

Before the first send:

- Add an unsubscribe that sets a suppression flag and is linked from every
  message. The signup does not have one yet.
- Confirm the consent sentence still matches what was stored.
- Keep `/internal/data-health` free of email addresses and phone numbers. A
  count would need a security-definer aggregate; the dashboard role cannot read
  this table.

Counts only belong in analytics. The events are `threshold_alert_cta_clicked`,
`threshold_alert_form_viewed`, `threshold_alert_signup_attempted`,
`threshold_alert_signup_completed`, `threshold_alert_signup_failed`, and
`server_threshold_alert_signup_created`. They carry counts, channel
(`email`, `whatsapp`, or `email_and_whatsapp`), cycle, and source path. They do
not carry the address or the phone.
