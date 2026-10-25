CREATE TABLE "enquiries" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"program_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"program_name" text NOT NULL,
	"institution_name" text NOT NULL,
	"source_path" text NOT NULL,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"referrer" varchar(256),
	"consent" boolean NOT NULL,
	"consent_text" text NOT NULL,
	"result_status" text NOT NULL,
	"bagrut" real,
	"psychometric" integer,
	"evaluation_input" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enquiries_result_status_check" CHECK ("enquiries"."result_status" in ('accepted', 'below', 'eligible_to_apply', 'unknown')),
	CONSTRAINT "enquiries_consent_check" CHECK ("enquiries"."consent" = true)
);
--> statement-breakpoint
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.enquiries FROM PUBLIC, anon, authenticated, app_runtime;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.enquiries TO service_role;
  END IF;
END $$;
--> statement-breakpoint
-- The server role may submit leads, but cannot list or read any contact details.
CREATE OR REPLACE FUNCTION public.store_enquiry(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.enquiries (
    request_id, name, phone, program_id, institution_id, program_name,
    institution_name, source_path, consent, consent_text, result_status,
    bagrut, psychometric, evaluation_input, created_at,
    utm_source, utm_medium, utm_campaign, referrer
  ) VALUES (
    (payload->>'requestId')::uuid, payload->>'name', payload->>'phone',
    payload->>'programId', payload->>'institutionId', payload->>'programName',
    payload->>'institutionName', payload->>'sourcePath', (payload->>'consent')::boolean,
    payload->>'consentText', payload->>'resultStatus', (payload->>'bagrut')::real,
    (payload->>'psychometric')::integer, payload->'evaluationInput',
    (payload->>'createdAt')::timestamptz,
    payload->'attribution'->>'utm_source', payload->'attribution'->>'utm_medium',
    payload->'attribution'->>'utm_campaign', payload->'attribution'->>'referrer'
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.store_enquiry(jsonb) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.store_enquiry(jsonb) TO app_runtime;
