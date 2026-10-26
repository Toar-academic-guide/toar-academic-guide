-- Add optional prep consent separately; CREATE OR REPLACE preserves owner and ACL.
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS "prep_consent" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS "prep_consent_text" text;
--> statement-breakpoint
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS "prep_consent_at" timestamp with time zone;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.store_enquiry(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.enquiries (
    request_id, name, phone, program_id, institution_id, program_name,
    institution_name, source_path, consent, consent_text, result_status,
    bagrut, psychometric, evaluation_input, created_at,
    utm_source, utm_medium, utm_campaign, referrer,
    prep_consent, prep_consent_text, prep_consent_at
  ) VALUES (
    (payload->>'requestId')::uuid, payload->>'name', payload->>'phone',
    payload->>'programId', payload->>'institutionId', payload->>'programName',
    payload->>'institutionName', payload->>'sourcePath', (payload->>'consent')::boolean,
    payload->>'consentText', payload->>'resultStatus', (payload->>'bagrut')::real,
    (payload->>'psychometric')::integer, payload->'evaluationInput',
    COALESCE((payload->>'createdAt')::timestamptz, now()),
    payload->'attribution'->>'utm_source', payload->'attribution'->>'utm_medium',
    payload->'attribution'->>'utm_campaign', payload->'attribution'->>'referrer',
    COALESCE((payload->>'prepConsent')::boolean, false),
    CASE WHEN COALESCE((payload->>'prepConsent')::boolean, false)
      THEN payload->>'prepConsentText' ELSE NULL END,
    CASE WHEN COALESCE((payload->>'prepConsent')::boolean, false)
      THEN (payload->>'prepConsentAt')::timestamptz ELSE NULL END
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;
