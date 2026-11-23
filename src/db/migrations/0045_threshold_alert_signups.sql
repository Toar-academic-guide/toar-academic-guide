CREATE TABLE "threshold_alert_signups" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"institutions" text[] NOT NULL,
	"degrees" text[] NOT NULL,
	"cycle" text NOT NULL,
	"consent" boolean NOT NULL,
	"consent_text" text NOT NULL,
	"source_path" text NOT NULL,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"referrer" varchar(256),
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "threshold_alert_signups_consent_check" CHECK ("threshold_alert_signups"."consent" = true),
	CONSTRAINT "threshold_alert_signups_cycle_check" CHECK ("threshold_alert_signups"."cycle" = '2027'),
	CONSTRAINT "threshold_alert_signups_contact_check" CHECK ("threshold_alert_signups"."email" is not null or "threshold_alert_signups"."phone" is not null),
	CONSTRAINT "threshold_alert_signups_target_check" CHECK (cardinality("threshold_alert_signups"."institutions") > 0 or cardinality("threshold_alert_signups"."degrees") > 0)
);
--> statement-breakpoint
CREATE INDEX "threshold_alert_signups_created_at_idx" ON "threshold_alert_signups" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE public.threshold_alert_signups ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.threshold_alert_signups FROM PUBLIC, anon, authenticated, app_runtime;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    REVOKE ALL ON TABLE public.threshold_alert_signups FROM ops_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admissions_automation') THEN
    REVOKE ALL ON TABLE public.threshold_alert_signups FROM admissions_automation;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.threshold_alert_signups TO service_role;
  END IF;
END $$;
--> statement-breakpoint
-- Insert-only. app_runtime cannot read contacts. The consent text is the alert
-- consent, never the enquiry or prep-company consent.
CREATE OR REPLACE FUNCTION public.store_threshold_alert_signup(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  signup_email text;
  signup_phone text;
  signup_institutions text[];
  signup_degrees text[];
  allowed_institutions text[] := ARRAY['ariel','bgu','biu','haifa','huji','reichman','tau','technion'];
  allowed_degrees text[] := ARRAY['accounting','biology','business','communications','cs','economics','electrical_engineering','industrial_engineering','law','mechanical_engineering','medicine','nursing','psychology','software_engineering'];
BEGIN
  IF coalesce((payload->>'consent')::boolean, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'threshold alert consent required';
  END IF;
  IF payload->>'consentText' IS DISTINCT FROM 'אני מבקש/ת ש-MyWay תשלח לי עדכון כשהמוסדות או התארים שסימנתי מפרסמים את תנאי הקבלה ואת ספי הסכם למחזור 2027. העדכון יישלח רק לדוא״ל או ל-WhatsApp שהשארתי כאן, ורק בשביל ההתראה הזו.' THEN
    RAISE EXCEPTION 'threshold alert consent text mismatch';
  END IF;
  IF payload->>'cycle' IS DISTINCT FROM '2027' THEN
    RAISE EXCEPTION 'threshold alert cycle mismatch';
  END IF;
  signup_email := nullif(lower(btrim(payload->>'email')), '');
  signup_phone := nullif(btrim(payload->>'phone'), '');
  IF signup_email IS NULL AND signup_phone IS NULL THEN
    RAISE EXCEPTION 'threshold alert contact required';
  END IF;
  IF signup_email IS NOT NULL AND signup_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'threshold alert email rejected';
  END IF;
  IF signup_phone IS NOT NULL AND signup_phone !~ '^\+9725[0-9]{8}$' THEN
    RAISE EXCEPTION 'threshold alert phone rejected';
  END IF;
  SELECT coalesce(array_agg(item ORDER BY item), ARRAY[]::text[])
    INTO signup_institutions
  FROM (
    SELECT DISTINCT value AS item
    FROM jsonb_array_elements_text(coalesce(payload->'institutions', '[]'::jsonb)) AS value
  ) items;
  SELECT coalesce(array_agg(item ORDER BY item), ARRAY[]::text[])
    INTO signup_degrees
  FROM (
    SELECT DISTINCT value AS item
    FROM jsonb_array_elements_text(coalesce(payload->'degrees', '[]'::jsonb)) AS value
  ) items;
  IF EXISTS (SELECT 1 FROM unnest(signup_institutions) AS id WHERE id <> ALL (allowed_institutions)) THEN
    RAISE EXCEPTION 'threshold alert institution rejected';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(signup_degrees) AS id WHERE id <> ALL (allowed_degrees)) THEN
    RAISE EXCEPTION 'threshold alert degree rejected';
  END IF;
  IF cardinality(signup_institutions) = 0 AND cardinality(signup_degrees) = 0 THEN
    RAISE EXCEPTION 'threshold alert target required';
  END IF;
  INSERT INTO public.threshold_alert_signups (
    request_id, email, phone, institutions, degrees, cycle, consent, consent_text,
    source_path, utm_source, utm_medium, utm_campaign, referrer, created_at
  ) VALUES (
    (payload->>'requestId')::uuid,
    signup_email,
    signup_phone,
    signup_institutions,
    signup_degrees,
    '2027',
    true,
    payload->>'consentText',
    payload->>'sourcePath',
    payload->'attribution'->>'utm_source',
    payload->'attribution'->>'utm_medium',
    payload->'attribution'->>'utm_campaign',
    payload->'attribution'->>'referrer',
    COALESCE((payload->>'createdAt')::timestamptz, now())
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.store_threshold_alert_signup(jsonb) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.store_threshold_alert_signup(jsonb) TO app_runtime;