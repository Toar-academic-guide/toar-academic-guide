-- Preserve the existing function owner and ACL; only default a missing/null timestamp.
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
    COALESCE((payload->>'createdAt')::timestamptz, now()),
    payload->'attribution'->>'utm_source', payload->'attribution'->>'utm_medium',
    payload->'attribution'->>'utm_campaign', payload->'attribution'->>'referrer'
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;
