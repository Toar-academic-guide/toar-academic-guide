-- NOT APPLIED — for Jorje review; do not run from CI
-- Braude Batch A, תשפ"ז. Review one section at a time; never execute this file wholesale.
-- Official sources: https://w3.braude.ac.il/intrested/
-- https://info.braude.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1
-- Schema names: src/db/schema.ts. Conventions: 2026-10-21 catalogue repair packets.
-- No new programme or threshold rows are required by phase 1. Stored programme
-- ids, legacy institution rows, requirement ids and source ids are retained.
-- NO cutoff SQL: admission_thresholds is read-only here. Any future cutoff change
-- must be a reviewedManifest.json canonical_change, with ledger before-guards.

-- ============================================================================
-- BACKUP (READ ONLY; export complete JSON and prestate_md5 for review)
-- ============================================================================
WITH backup AS (SELECT jsonb_build_object(
  'institutions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.institutions t WHERE id IN ('braude','ort_braude','mon_12220708942')),
  'programs', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.programs t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'program_institutions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.program_institutions t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_requirements', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_requirements t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'source_urls', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.source_urls t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admissions_source_candidates', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admissions_source_candidates t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_facts', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_facts t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_alternative_paths', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_alternative_paths t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_thresholds', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_thresholds t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'university_calculator_configs', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.university_calculator_configs t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_operational_proof_values', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_operational_proof_values t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_target_transitions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_target_transitions t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_alert_subscriptions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_alert_subscriptions t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'ingestion_sources', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.ingestion_sources t WHERE institution_id IN ('braude','ort_braude','mon_12220708942'))
) AS rows)
SELECT rows AS backup_json, md5(rows::text) AS prestate_md5 FROM backup;

-- ============================================================================
-- APPLY (ONE SERIALIZABLE TRANSACTION; explicit flag AND reviewed snapshot hash)
-- ============================================================================
-- After a fresh BACKUP is reviewed, Jorje may separately SET the two settings:
-- myway.braude_apply = '2026-10-25'
-- myway.braude_expected_prestate = the exact BACKUP prestate_md5 (never guessed).
-- No setting is enabled by this packet. Drift forces a new backup and review.
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
DO $$
BEGIN
  IF current_setting('myway.braude_apply', true) IS DISTINCT FROM '2026-10-25'
     OR COALESCE(current_setting('myway.braude_expected_prestate', true), '') !~ '^[0-9a-f]{32}$' THEN
    RAISE EXCEPTION 'Braude packet is not authorized with a reviewed prestate hash';
  END IF;
  IF to_regnamespace('braude_batch_a_20261025') IS NOT NULL THEN
    RAISE EXCEPTION 'Backup namespace already exists; do not reapply';
  END IF;
END $$;

LOCK TABLE public.institutions, public.programs, public.program_institutions, public.admission_requirements, public.source_urls, public.admissions_source_candidates, public.admission_facts, public.admission_alternative_paths, public.admission_thresholds, public.university_calculator_configs, public.admission_operational_proof_values, public.admission_target_transitions, public.admission_alert_subscriptions, public.ingestion_sources IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA braude_batch_a_20261025;
REVOKE ALL ON SCHEMA braude_batch_a_20261025 FROM PUBLIC, anon, authenticated;
CREATE TABLE braude_batch_a_20261025.packet (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  before_rows jsonb NOT NULL,
  after_rows jsonb,
  state text NOT NULL CHECK (state IN ('backed_up', 'applied', 'rolled_back'))
);
ALTER TABLE braude_batch_a_20261025.packet ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON braude_batch_a_20261025.packet FROM PUBLIC, anon, authenticated;

CREATE FUNCTION braude_batch_a_20261025.snapshot() RETURNS jsonb
LANGUAGE sql VOLATILE SET search_path = '' AS $snapshot$
SELECT jsonb_build_object(
  'institutions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.institutions t WHERE id IN ('braude','ort_braude','mon_12220708942')),
  'programs', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.programs t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'program_institutions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.program_institutions t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_requirements', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_requirements t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'source_urls', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.source_urls t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admissions_source_candidates', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admissions_source_candidates t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_facts', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_facts t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_alternative_paths', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_alternative_paths t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_thresholds', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_thresholds t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'university_calculator_configs', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.university_calculator_configs t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_operational_proof_values', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_operational_proof_values t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_target_transitions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_target_transitions t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'admission_alert_subscriptions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.admission_alert_subscriptions t WHERE institution_id IN ('braude','ort_braude','mon_12220708942')),
  'ingestion_sources', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.ingestion_sources t WHERE institution_id IN ('braude','ort_braude','mon_12220708942'))
);
$snapshot$;
REVOKE ALL ON FUNCTION braude_batch_a_20261025.snapshot() FROM PUBLIC, anon, authenticated;
INSERT INTO braude_batch_a_20261025.packet (before_rows, state)
VALUES (braude_batch_a_20261025.snapshot(), 'backed_up');

DO $$
DECLARE t text;
BEGIN
  IF (SELECT md5(before_rows::text) FROM braude_batch_a_20261025.packet)
       IS DISTINCT FROM current_setting('myway.braude_expected_prestate', true) THEN
    RAISE EXCEPTION 'Prestate drifted from reviewed BACKUP';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id='ort_braude'
      AND domain IN ('braude.ac.il','w3.braude.ac.il'))
     OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id='mon_12220708942_cs'
       AND institution_id IN ('ort_braude','mon_12220708942')) THEN
    RAISE EXCEPTION 'Expected legacy Braude institution and CS programme not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.institutions WHERE id='braude'
       AND COALESCE(domain,'') NOT IN ('braude.ac.il','w3.braude.ac.il')) THEN
    RAISE EXCEPTION 'Canonical institution conflicts with official Braude identity';
  END IF;
  IF EXISTS (SELECT 1 FROM public.programs WHERE institution_id IN ('ort_braude','mon_12220708942')
       AND id NOT IN ('braude_engineering','braude_prep','mon_12220708942_cs')) THEN
    RAISE EXCEPTION 'Unreviewed legacy programme scope';
  END IF;
  -- Changing identities of numeric/publication targets needs its own reviewed
  -- canonical_change and ledger reconciliation. Never silently move those rows.
  FOREACH t IN ARRAY ARRAY['admission_thresholds','university_calculator_configs',
    'admission_operational_proof_values','admission_target_transitions',
    'admission_alert_subscriptions','ingestion_sources'] LOOP
    IF jsonb_path_exists((SELECT before_rows->t FROM braude_batch_a_20261025.packet),
      '$[*] ? (@.institution_id == "ort_braude" || @.institution_id == "mon_12220708942")') THEN
      RAISE EXCEPTION 'Legacy dependencies in % require a separately reviewed identity/publication plan', t;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.program_institutions
    WHERE institution_id IN ('braude','ort_braude','mon_12220708942')
    GROUP BY program_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Colliding programme links: review deduplication separately';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_requirements
    WHERE institution_id IN ('braude','ort_braude','mon_12220708942')
    GROUP BY program_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Colliding programme requirements: no automatic loss of evidence';
  END IF;
END $$;

-- Allocate canonical identity only when absent. Keep both alias rows verbatim.
INSERT INTO public.institutions
  (id,name,region,domain,logo_url,program_url,calculator_url,university_id)
SELECT 'braude',name,region,domain,logo_url,program_url,calculator_url,university_id
FROM public.institutions WHERE id='ort_braude'
  AND NOT EXISTS (SELECT 1 FROM public.institutions WHERE id='braude');

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['programs','program_institutions','admission_requirements',
    'source_urls','admissions_source_candidates','admission_facts','admission_alternative_paths'] LOOP
    EXECUTE format('UPDATE public.%I SET institution_id = %L WHERE institution_id IN (%L,%L)',
      t, 'braude', 'ort_braude', 'mon_12220708942');
  END LOOP;
END $$;
UPDATE braude_batch_a_20261025.packet
SET after_rows=braude_batch_a_20261025.snapshot(), state='applied';
COMMIT;

-- ============================================================================
-- ROLLBACK (SEPARATE MANUAL TRANSACTION; refuses ANY scoped drift)
-- ============================================================================
-- Separately set myway.braude_rollback = '2026-10-25' only for rollback review.
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
DO $$
BEGIN
  IF current_setting('myway.braude_rollback', true) IS DISTINCT FROM '2026-10-25' THEN
    RAISE EXCEPTION 'Braude rollback not authorized';
  END IF;
END $$;
LOCK TABLE public.institutions, public.programs, public.program_institutions, public.admission_requirements, public.source_urls, public.admissions_source_candidates, public.admission_facts, public.admission_alternative_paths, public.admission_thresholds, public.university_calculator_configs, public.admission_operational_proof_values, public.admission_target_transitions, public.admission_alert_subscriptions, public.ingestion_sources IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE saved jsonb; t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM braude_batch_a_20261025.packet WHERE state='applied'
      AND after_rows=braude_batch_a_20261025.snapshot()) THEN
    RAISE EXCEPTION 'Missing applied backup or scoped rows drifted; rollback refused';
  END IF;
  SELECT before_rows INTO saved FROM braude_batch_a_20261025.packet;
  FOREACH t IN ARRAY ARRAY['programs','admission_requirements','source_urls',
    'admissions_source_candidates','admission_facts','admission_alternative_paths'] LOOP
    EXECUTE format('UPDATE public.%1$I AS live SET institution_id = old.institution_id
      FROM jsonb_populate_recordset(NULL::public.%1$I, $1) AS old
      WHERE live.id = old.id AND live.institution_id IS DISTINCT FROM old.institution_id',t)
      USING saved->t;
  END LOOP;
  UPDATE public.program_institutions AS live SET institution_id=old.institution_id
  FROM jsonb_populate_recordset(NULL::public.program_institutions, saved->'program_institutions') AS old
  WHERE live.program_id=old.program_id AND live.institution_id='braude'
    AND old.institution_id IN ('ort_braude','mon_12220708942');
  -- Only the identity allocated by THIS packet may be removed, after its links
  -- are restored. FK constraints refuse deletion if an unsnapshotted user linked it.
  IF NOT jsonb_path_exists(saved->'institutions', '$[*] ? (@.id == "braude")') THEN
    DELETE FROM public.institutions WHERE id='braude';
  END IF;
  IF braude_batch_a_20261025.snapshot() IS DISTINCT FROM saved THEN
    RAISE EXCEPTION 'Rollback does not equal the exact backup';
  END IF;
  UPDATE braude_batch_a_20261025.packet SET state='rolled_back';
END $$;
COMMIT;

-- ============================================================================
-- VERIFY (READ ONLY, AFTER APPLY OR ROLLBACK; retain private backup)
-- ============================================================================
SELECT state,
  CASE state WHEN 'applied' THEN after_rows=braude_batch_a_20261025.snapshot()
             WHEN 'rolled_back' THEN before_rows=braude_batch_a_20261025.snapshot()
             ELSE false END AS matches_expected_state,
  before_rows->'admission_thresholds'=braude_batch_a_20261025.snapshot()->'admission_thresholds'
    AS numeric_rows_unchanged
FROM braude_batch_a_20261025.packet;
SELECT id,institution_id FROM public.programs
WHERE id IN ('braude_engineering','braude_prep','mon_12220708942_cs') ORDER BY id;
SELECT program_id,institution_id FROM public.program_institutions
WHERE institution_id IN ('braude','ort_braude','mon_12220708942') ORDER BY program_id,institution_id;
SELECT id,name,domain FROM public.institutions
WHERE id IN ('braude','ort_braude','mon_12220708942') ORDER BY id;
