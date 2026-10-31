-- Author: Eitan. 2026-10-31. NOT A MIGRATION. NOT EXECUTED BY CI.
-- Mario runs after merge and prod READY. Preview shares the production database.
-- Run with an owner connection and ON_ERROR_STOP enabled; inspect the prechecks,
-- backup and verification output. ROLLBACK is the default. Mario may replace the
-- final ROLLBACK with COMMIT only for the reviewed production application.
-- Sources:
-- https://info.huji.ac.il/bachelor/Life-Sciences (19.000 on HUJI's 11–30 scale)
-- https://info.huji.ac.il/bachelor/Medicine
-- https://go.tau.ac.il/graphql (preliminary medicine acceptanceThreshold 726.44;
-- live getProgramByIdAndLang node 8215 returns it in field_registration_comments)
-- https://go.tau.ac.il/he/med/ba/med-doc?v=new-info
-- https://admissions.technion.ac.il/sechem-for-admission/
-- https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/
-- Technion 92 is an estimated invitation threshold for the MOR test, not final admission.
-- https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=471&p_pat1=1&p_degree_level=8
-- https://medicine.biu.ac.il/six_year_track_application_requirements
-- https://www.jmc.ac.il/ and https://www.aac.ac.il/
-- Hadassah desired strings match commit 6a54a26 / PR #353; old values below
-- come from main 2e43e5f's buildCatalogueSeed output. No #353 code is ported here.
-- Scale rule: use a figure only on its column's scale; otherwise retain the row
-- with NULL. Never put HUJI's 11–30 values into legacy 200–800 columns.

-- Read-only prechecks. The locked guards below abort on incompatible state.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admission_thresholds'
  AND column_name = 'threshold_value';
SELECT id, program_id, institution_id, university_id, threshold_kind, threshold_value
FROM public.admission_thresholds
WHERE program_id IN ('huji_biology', 'medicine', 'huji_medicine', 'tau_medicine', 'biu_medicine')
ORDER BY id;
SELECT id, name, domain, program_url FROM public.institutions
WHERE id IN ('hadassah', 'ashkelon') OR name = 'המרכז האקדמי הרב-תחומי ירושלים';
SELECT id, name, institution_name FROM public.programs
WHERE id = 'hadassah_general_academic'
  OR name LIKE '%המרכז האקדמי הרב-תחומי ירושלים%'
  OR institution_name = 'המרכז האקדמי הרב-תחומי ירושלים';

BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.admission_thresholds, public.institutions, public.programs,
  public.program_institutions IN SHARE ROW EXCLUSIVE MODE;

DO $precheck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admission_thresholds'
      AND column_name = 'threshold_value' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'threshold_value must exist and accept NULL; stop before any changes';
  END IF;
  IF (SELECT count(*) FROM public.admission_thresholds WHERE program_id = 'huji_biology') <> 1 THEN
    RAISE EXCEPTION 'huji_biology must have exactly one threshold row';
  END IF;
  IF (SELECT count(*) FROM public.admission_thresholds t JOIN (VALUES
    ('huji_biology:huji:huji:sekhem', 'huji_biology', 'huji', 640),
    ('medicine:tau:tau:sekhem', 'medicine', 'tau', 770),
    ('medicine:huji:huji:sekhem', 'medicine', 'huji', 775),
    ('medicine:technion:technion:sekhem', 'medicine', 'technion', 94),
    ('medicine:biu:biu:sekhem', 'medicine', 'biu', 740),
    ('huji_medicine:huji:huji:sekhem', 'huji_medicine', 'huji', 775),
    ('tau_medicine:tau:tau:sekhem', 'tau_medicine', 'tau', 770),
    ('biu_medicine:biu:biu:sekhem', 'biu_medicine', 'biu', 740)
  ) old(id, program_id, institution_id, value)
    ON t.id = old.id AND t.program_id = old.program_id
      AND t.institution_id = old.institution_id AND t.university_id = old.institution_id
      AND t.threshold_kind = 'sekhem' AND t.threshold_value = old.value) <> 8 THEN
    RAISE EXCEPTION 'Expected eight unchanged legacy thresholds; inspect drift or prior application';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'medicine')
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'bgu') THEN
    RAISE EXCEPTION 'Generic medicine and BGU must already exist';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE (id = 'medicine:bgu:bgu:sekhem'
      OR (program_id = 'medicine' AND institution_id = 'bgu'
        AND university_id = 'bgu' AND threshold_kind = 'sekhem'))
      AND NOT (id = 'medicine:bgu:bgu:sekhem' AND program_id = 'medicine'
        AND institution_id = 'bgu' AND university_id = 'bgu'
        AND threshold_kind = 'sekhem' AND threshold_value IS NOT DISTINCT FROM 735)) THEN
    RAISE EXCEPTION 'Existing generic BGU medicine threshold differs; do not overwrite';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'hadassah'
    AND name IN ('המרכז האקדמי הרב-תחומי ירושלים', 'המרכז האקדמי הרב תחומי ירושלים')
    AND domain IN ('macam.ac.il', 'jmc.ac.il')
    AND program_url IN ('https://www.macam.ac.il', 'https://www.jmc.ac.il/'))
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'ashkelon'
      AND domain IN ('ac.il', 'aac.ac.il')
      AND (program_url IS NULL OR program_url = 'https://www.aac.ac.il/')) THEN
    RAISE EXCEPTION 'Institution fields differ from main / reviewed destination';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'hadassah_general_academic'
    AND institution_id = 'hadassah'
    AND name IN ('לימודים אקדמיים - המכללה האקדמית הדסה ירושלים',
      'לימודים אקדמיים - המרכז האקדמי הרב-תחומי ירושלים',
      'לימודים אקדמיים - המרכז האקדמי הרב תחומי ירושלים')
    AND institution_name IN ('המכללה האקדמית הדסה ירושלים',
      'המרכז האקדמי הרב-תחומי ירושלים', 'המרכז האקדמי הרב תחומי ירושלים')) THEN
    RAISE EXCEPTION 'Hadassah programme identity differs; inspect before changing it';
  END IF;
END $precheck$;

-- Backup precedes mutations in this transaction. A committed application retains
-- these owner-only tables for rollback. An existing schema aborts a rerun.
CREATE SCHEMA hadassah_huji_20261031;
REVOKE ALL ON SCHEMA hadassah_huji_20261031 FROM PUBLIC;
CREATE TABLE hadassah_huji_20261031.thresholds_before AS
SELECT * FROM public.admission_thresholds WHERE id IN (
  'huji_biology:huji:huji:sekhem', 'medicine:tau:tau:sekhem',
  'medicine:huji:huji:sekhem', 'medicine:technion:technion:sekhem',
  'medicine:biu:biu:sekhem', 'huji_medicine:huji:huji:sekhem',
  'tau_medicine:tau:tau:sekhem', 'biu_medicine:biu:biu:sekhem', 'medicine:bgu:bgu:sekhem');
CREATE TABLE hadassah_huji_20261031.institutions_before AS
SELECT * FROM public.institutions WHERE id IN ('hadassah', 'ashkelon')
  OR name = 'המרכז האקדמי הרב-תחומי ירושלים';
CREATE TABLE hadassah_huji_20261031.programs_before AS
SELECT * FROM public.programs WHERE id = 'hadassah_general_academic'
  OR name LIKE '%המרכז האקדמי הרב-תחומי ירושלים%'
  OR institution_name = 'המרכז האקדמי הרב-תחומי ירושלים';
CREATE TABLE hadassah_huji_20261031.links_before AS
SELECT * FROM public.program_institutions WHERE program_id = 'medicine' AND institution_id = 'bgu';

UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'huji_biology:huji:huji:sekhem' AND threshold_value = 640;
UPDATE public.admission_thresholds SET threshold_value = 726.44
WHERE id = 'medicine:tau:tau:sekhem' AND threshold_value = 770;
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'medicine:huji:huji:sekhem' AND threshold_value = 775;
UPDATE public.admission_thresholds SET threshold_value = 92
WHERE id = 'medicine:technion:technion:sekhem' AND threshold_value = 94;
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'medicine:biu:biu:sekhem' AND threshold_value = 740;
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'huji_medicine:huji:huji:sekhem' AND threshold_value = 775;
UPDATE public.admission_thresholds SET threshold_value = 726.44
WHERE id = 'tau_medicine:tau:tau:sekhem' AND threshold_value = 770;
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'biu_medicine:biu:biu:sekhem' AND threshold_value = 740;

-- Main has no generic BGU relation/threshold: NULL was omitted by pair discovery.
-- Add the relation and row only if absent; preserve a pre-existing matching 735.
-- This adds catalogue membership, not an exact-verification claim for the alias.
INSERT INTO public.program_institutions (program_id, institution_id)
VALUES ('medicine', 'bgu') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_thresholds
  (id, program_id, institution_id, university_id, threshold_kind, threshold_value)
SELECT 'medicine:bgu:bgu:sekhem', 'medicine', 'bgu', 'bgu', 'sekhem', 735
WHERE NOT EXISTS (SELECT 1 FROM public.admission_thresholds WHERE id = 'medicine:bgu:bgu:sekhem')
ON CONFLICT DO NOTHING;

UPDATE public.institutions SET name = 'המרכז האקדמי הרב תחומי ירושלים', updated_at = now()
WHERE name = 'המרכז האקדמי הרב-תחומי ירושלים';
UPDATE public.institutions SET domain = 'jmc.ac.il', updated_at = now()
WHERE id = 'hadassah' AND domain = 'macam.ac.il';
UPDATE public.institutions SET program_url = 'https://www.jmc.ac.il/', updated_at = now()
WHERE id = 'hadassah' AND program_url = 'https://www.macam.ac.il';
UPDATE public.institutions SET domain = 'aac.ac.il', updated_at = now()
WHERE id = 'ashkelon' AND domain = 'ac.il';
UPDATE public.institutions SET program_url = 'https://www.aac.ac.il/', updated_at = now()
WHERE id = 'ashkelon' AND program_url IS NULL;

UPDATE public.programs SET name = 'לימודים אקדמיים - המרכז האקדמי הרב תחומי ירושלים', updated_at = now()
WHERE id = 'hadassah_general_academic' AND name = 'לימודים אקדמיים - המכללה האקדמית הדסה ירושלים';
UPDATE public.programs SET institution_name = 'המרכז האקדמי הרב תחומי ירושלים', updated_at = now()
WHERE id = 'hadassah_general_academic' AND institution_name = 'המכללה האקדמית הדסה ירושלים';
-- These are the other stored name fields read by catalogue serializers; there is
-- no separate provider column. Exact old-string predicates cover legacy aliases.
UPDATE public.programs SET name = replace(name, 'המרכז האקדמי הרב-תחומי ירושלים',
  'המרכז האקדמי הרב תחומי ירושלים'), updated_at = now()
WHERE name LIKE '%המרכז האקדמי הרב-תחומי ירושלים%';
UPDATE public.programs SET institution_name = 'המרכז האקדמי הרב תחומי ירושלים', updated_at = now()
WHERE institution_name = 'המרכז האקדמי הרב-תחומי ירושלים';
-- Historical enquiries are immutable consent snapshots, not catalogue providers;
-- they are not rewritten. Static maps are outside this packet's database scope.

DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.admission_thresholds t JOIN (VALUES
    ('huji_biology:huji:huji:sekhem', NULL::numeric),
    ('medicine:tau:tau:sekhem', 726.44), ('medicine:huji:huji:sekhem', NULL::numeric),
    ('medicine:technion:technion:sekhem', 92), ('medicine:biu:biu:sekhem', NULL::numeric),
    ('huji_medicine:huji:huji:sekhem', NULL::numeric),
    ('tau_medicine:tau:tau:sekhem', 726.44), ('biu_medicine:biu:biu:sekhem', NULL::numeric),
    ('medicine:bgu:bgu:sekhem', 735)
  ) expected(id, value) ON t.id = expected.id
    AND t.threshold_value IS NOT DISTINCT FROM expected.value) <> 9 THEN
    RAISE EXCEPTION 'Threshold verification failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.program_institutions
    WHERE program_id = 'medicine' AND institution_id = 'bgu') THEN
    RAISE EXCEPTION 'Generic BGU medicine link is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'hadassah'
    AND name = 'המרכז האקדמי הרב תחומי ירושלים' AND domain = 'jmc.ac.il'
    AND program_url = 'https://www.jmc.ac.il/')
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'ashkelon'
      AND domain = 'aac.ac.il' AND program_url = 'https://www.aac.ac.il/')
    OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'hadassah_general_academic'
      AND name = 'לימודים אקדמיים - המרכז האקדמי הרב תחומי ירושלים'
      AND institution_name = 'המרכז האקדמי הרב תחומי ירושלים') THEN
    RAISE EXCEPTION 'Institution/programme identity verification failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.institutions WHERE name = 'המרכז האקדמי הרב-תחומי ירושלים')
    OR EXISTS (SELECT 1 FROM public.programs WHERE institution_name = 'המרכז האקדמי הרב-תחומי ירושלים'
      OR name LIKE '%המרכז האקדמי הרב-תחומי ירושלים%') THEN
    RAISE EXCEPTION 'A hyphenated Hadassah provider/name field remains';
  END IF;
END $verify$;

-- Save after-images so rollback can refuse to overwrite subsequent changes.
CREATE TABLE hadassah_huji_20261031.thresholds_after AS
SELECT * FROM public.admission_thresholds WHERE id IN
  (SELECT id FROM hadassah_huji_20261031.thresholds_before) OR id = 'medicine:bgu:bgu:sekhem';
CREATE TABLE hadassah_huji_20261031.institutions_after AS
SELECT * FROM public.institutions WHERE id IN (SELECT id FROM hadassah_huji_20261031.institutions_before);
CREATE TABLE hadassah_huji_20261031.programs_after AS
SELECT * FROM public.programs WHERE id IN (SELECT id FROM hadassah_huji_20261031.programs_before);
CREATE TABLE hadassah_huji_20261031.links_after AS
SELECT * FROM public.program_institutions WHERE program_id = 'medicine' AND institution_id = 'bgu';

-- Verification output for Mario's application record.
SELECT id, threshold_value FROM hadassah_huji_20261031.thresholds_after ORDER BY id;
SELECT id, name, domain, program_url FROM hadassah_huji_20261031.institutions_after ORDER BY id;
SELECT id, name, institution_name FROM hadassah_huji_20261031.programs_after ORDER BY id;
SELECT * FROM hadassah_huji_20261031.links_after;
ROLLBACK;

/*
Rollback after a committed application: owner connection, ON_ERROR_STOP enabled.
Keep the backup schema until the application and rollback window are signed off.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.admission_thresholds, public.institutions, public.programs,
  public.program_institutions IN SHARE ROW EXCLUSIVE MODE;
DO $rollback_guard$
DECLARE table_pair text[]; live_rows jsonb; saved_rows jsonb;
BEGIN
  FOREACH table_pair SLICE 1 IN ARRAY ARRAY[
    ['admission_thresholds', 'thresholds_after'], ['institutions', 'institutions_after'],
    ['programs', 'programs_after']
  ] LOOP
    EXECUTE format('SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.%I t
      WHERE t.id IN (SELECT id FROM hadassah_huji_20261031.%I)', table_pair[1], table_pair[2]) INTO live_rows;
    EXECUTE format('SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM hadassah_huji_20261031.%I t',
      table_pair[2]) INTO saved_rows;
    IF live_rows IS DISTINCT FROM saved_rows THEN
      RAISE EXCEPTION 'Post-application drift in %, inspect before rollback', table_pair[1];
    END IF;
  END LOOP;
  SELECT jsonb_agg(to_jsonb(t)) INTO live_rows FROM public.program_institutions t
    WHERE program_id = 'medicine' AND institution_id = 'bgu';
  SELECT jsonb_agg(to_jsonb(t)) INTO saved_rows FROM hadassah_huji_20261031.links_after t;
  IF live_rows IS DISTINCT FROM saved_rows THEN RAISE EXCEPTION 'BGU link drift'; END IF;
END $rollback_guard$;
DELETE FROM public.admission_thresholds t WHERE t.id = 'medicine:bgu:bgu:sekhem'
  AND NOT EXISTS (SELECT 1 FROM hadassah_huji_20261031.thresholds_before b WHERE b.id = t.id);
DELETE FROM public.program_institutions t WHERE t.program_id = 'medicine' AND t.institution_id = 'bgu'
  AND NOT EXISTS (SELECT 1 FROM hadassah_huji_20261031.links_before);
UPDATE public.admission_thresholds t SET threshold_value = b.threshold_value
  FROM hadassah_huji_20261031.thresholds_before b WHERE t.id = b.id;
UPDATE public.institutions t SET name = b.name, domain = b.domain,
  program_url = b.program_url, updated_at = b.updated_at
  FROM hadassah_huji_20261031.institutions_before b WHERE t.id = b.id;
UPDATE public.programs t SET name = b.name, institution_name = b.institution_name, updated_at = b.updated_at
  FROM hadassah_huji_20261031.programs_before b WHERE t.id = b.id;
COMMIT;
Repeat the precheck SELECTs to confirm restoration. Do not rerun the forward packet.
*/
