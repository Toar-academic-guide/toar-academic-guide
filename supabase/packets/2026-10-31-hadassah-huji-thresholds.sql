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
-- Technion intentionally untouched: Mario confirmed prod already has 92 on 2026-10-31.
-- The static 92 remains an estimated MOR invitation threshold from the URLs above;
-- captured in /workspace/codex-tasks/medicine-captures-2026-10-31/capture.md.
-- https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=471&p_pat1=1&p_degree_level=8
-- https://medicine.biu.ac.il/six_year_track_application_requirements
-- https://www.jmc.ac.il/ and https://www.aac.ac.il/
-- Guards use only Mario's read-only prod report of 2026-10-31.
-- Biology 640 is not in Mario's 2026-10-31 list — needs confirmation; retain its
-- briefed UPDATE with the fail-closed per-row guard. No live value is inferred.
-- Hadassah target spelling: המרכז האקדמי הרב תחומי ירושלים (official JMC about
-- page, /על-המרכז/אודות/על-המרכז/). Curl received a WAF challenge; official
-- page text was verified with the web fetch. Raw evidence is outside the repo:
-- /workspace/codex-tasks/hac-jmc-evidence-2026-10-31/.
-- Scale rule: use a figure only on its column's scale; otherwise retain the row
-- with NULL. Never put HUJI's 11–30 values into legacy 200–800 columns.

-- Read-only prechecks. No database connection or execution is part of this PR.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admission_thresholds'
  AND column_name = 'threshold_value';
SELECT id, program_id, institution_id, university_id, threshold_kind, threshold_value
FROM public.admission_thresholds WHERE id IN (
  'huji_biology:huji:huji:sekhem',
  'medicine:tau:tau:sekhem',
  'medicine:huji:huji:sekhem',
  'medicine:biu:biu:sekhem',
  'huji_medicine:huji:huji:sekhem',
  'tau_medicine:tau:tau:sekhem',
  'biu_medicine:biu:biu:sekhem',
  'medicine:bgu:bgu:sekhem') ORDER BY id;
SELECT id, name, domain, program_url FROM public.institutions
WHERE id IN ('hadassah', 'ashkelon');

BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.admission_thresholds, public.institutions,
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
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'huji_biology:huji:huji:sekhem' AND threshold_value = 640
      AND program_id = 'huji_biology' AND institution_id = 'huji'
      AND university_id = 'huji' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'huji_biology:huji:huji:sekhem must retain threshold_value = 640 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'medicine:tau:tau:sekhem' AND threshold_value = 770
      AND program_id = 'medicine' AND institution_id = 'tau'
      AND university_id = 'tau' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'medicine:tau:tau:sekhem must retain threshold_value = 770 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'medicine:huji:huji:sekhem' AND threshold_value = 775
      AND program_id = 'medicine' AND institution_id = 'huji'
      AND university_id = 'huji' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'medicine:huji:huji:sekhem must retain threshold_value = 775 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'medicine:biu:biu:sekhem' AND threshold_value = 740
      AND program_id = 'medicine' AND institution_id = 'biu'
      AND university_id = 'biu' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'medicine:biu:biu:sekhem must retain threshold_value = 740 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'huji_medicine:huji:huji:sekhem' AND threshold_value = 775
      AND program_id = 'huji_medicine' AND institution_id = 'huji'
      AND university_id = 'huji' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'huji_medicine:huji:huji:sekhem must retain threshold_value = 775 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'tau_medicine:tau:tau:sekhem' AND threshold_value = 770
      AND program_id = 'tau_medicine' AND institution_id = 'tau'
      AND university_id = 'tau' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'tau_medicine:tau:tau:sekhem must retain threshold_value = 770 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE id = 'biu_medicine:biu:biu:sekhem' AND threshold_value = 740
      AND program_id = 'biu_medicine' AND institution_id = 'biu'
      AND university_id = 'biu' AND threshold_kind = 'sekhem') THEN
    RAISE EXCEPTION 'biu_medicine:biu:biu:sekhem must retain threshold_value = 740 and its exact identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions
    WHERE id = 'hadassah' AND name = 'המרכז האקדמי הרב-תחומי ירושלים') THEN
    RAISE EXCEPTION 'institutions.hadassah.name differs from the exact expected old value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions
    WHERE id = 'hadassah' AND domain = 'macam.ac.il') THEN
    RAISE EXCEPTION 'institutions.hadassah.domain differs from the exact expected old value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions
    WHERE id = 'hadassah' AND program_url = 'https://www.macam.ac.il') THEN
    RAISE EXCEPTION 'institutions.hadassah.program_url differs from the exact expected old value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions
    WHERE id = 'ashkelon' AND domain = 'ac.il') THEN
    RAISE EXCEPTION 'institutions.ashkelon.domain differs from the exact expected old value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions
    WHERE id = 'ashkelon' AND program_url = 'https://www.ac.il') THEN
    RAISE EXCEPTION 'institutions.ashkelon.program_url differs from the exact expected old value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'medicine')
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'bgu') THEN
    RAISE EXCEPTION 'Generic medicine and BGU must already exist';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_thresholds t
    WHERE (t.id = 'medicine:bgu:bgu:sekhem'
      OR (t.program_id = 'medicine' AND t.institution_id = 'bgu'
        AND t.university_id = 'bgu' AND t.threshold_kind = 'sekhem'))
      AND ROW(t.id, t.program_id, t.institution_id, t.university_id, t.threshold_kind, t.threshold_value)
        IS DISTINCT FROM ROW('medicine:bgu:bgu:sekhem', 'medicine', 'bgu', 'bgu', 'sekhem', 735::numeric)) THEN
    RAISE EXCEPTION 'medicine:bgu:bgu:sekhem conflicts with the confirmed identity/value 735';
  END IF;
END $precheck$;

-- Backup precedes mutations in this transaction. A committed application retains
-- these owner-only tables for rollback. An existing schema aborts a rerun.
CREATE SCHEMA hadassah_huji_20261031;
REVOKE ALL ON SCHEMA hadassah_huji_20261031 FROM PUBLIC;
CREATE TABLE hadassah_huji_20261031.thresholds_before AS
SELECT * FROM public.admission_thresholds WHERE id IN (
  'huji_biology:huji:huji:sekhem',
  'medicine:tau:tau:sekhem',
  'medicine:huji:huji:sekhem',
  'medicine:biu:biu:sekhem',
  'huji_medicine:huji:huji:sekhem',
  'tau_medicine:tau:tau:sekhem',
  'biu_medicine:biu:biu:sekhem',
  'medicine:bgu:bgu:sekhem');
CREATE TABLE hadassah_huji_20261031.institutions_before AS
SELECT * FROM public.institutions WHERE id IN ('hadassah', 'ashkelon');
CREATE TABLE hadassah_huji_20261031.links_before AS
SELECT * FROM public.program_institutions WHERE program_id = 'medicine' AND institution_id = 'bgu';
CREATE TABLE hadassah_huji_20261031.inserted_rows (
  table_name text NOT NULL,
  row_id text NOT NULL,
  row_data jsonb NOT NULL,
  PRIMARY KEY (table_name, row_id)
);

UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'huji_biology:huji:huji:sekhem' AND threshold_value = 640
      AND program_id = 'huji_biology' AND institution_id = 'huji'
      AND university_id = 'huji' AND threshold_kind = 'sekhem';
UPDATE public.admission_thresholds SET threshold_value = 726.44
WHERE id = 'medicine:tau:tau:sekhem' AND threshold_value = 770
      AND program_id = 'medicine' AND institution_id = 'tau'
      AND university_id = 'tau' AND threshold_kind = 'sekhem';
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'medicine:huji:huji:sekhem' AND threshold_value = 775
      AND program_id = 'medicine' AND institution_id = 'huji'
      AND university_id = 'huji' AND threshold_kind = 'sekhem';
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'medicine:biu:biu:sekhem' AND threshold_value = 740
      AND program_id = 'medicine' AND institution_id = 'biu'
      AND university_id = 'biu' AND threshold_kind = 'sekhem';
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'huji_medicine:huji:huji:sekhem' AND threshold_value = 775
      AND program_id = 'huji_medicine' AND institution_id = 'huji'
      AND university_id = 'huji' AND threshold_kind = 'sekhem';
UPDATE public.admission_thresholds SET threshold_value = 726.44
WHERE id = 'tau_medicine:tau:tau:sekhem' AND threshold_value = 770
      AND program_id = 'tau_medicine' AND institution_id = 'tau'
      AND university_id = 'tau' AND threshold_kind = 'sekhem';
UPDATE public.admission_thresholds SET threshold_value = NULL
WHERE id = 'biu_medicine:biu:biu:sekhem' AND threshold_value = 740
      AND program_id = 'biu_medicine' AND institution_id = 'biu'
      AND university_id = 'biu' AND threshold_kind = 'sekhem';

-- Mario confirmed the exact BGU threshold row already exists at 735.
-- Matching rows are no-ops; only conflicting threshold identity/data aborts.
-- Link existence is UNCONFIRMED: insert if absent, otherwise leave it unchanged.
WITH inserted AS (
INSERT INTO public.program_institutions (program_id, institution_id)
SELECT 'medicine', 'bgu'
WHERE NOT EXISTS (SELECT 1 FROM public.program_institutions
  WHERE program_id = 'medicine' AND institution_id = 'bgu')
ON CONFLICT DO NOTHING
RETURNING *
)
INSERT INTO hadassah_huji_20261031.inserted_rows (table_name, row_id, row_data)
SELECT 'program_institutions', 'medicine:bgu', to_jsonb(inserted) FROM inserted;
WITH inserted AS (
INSERT INTO public.admission_thresholds
  (id, program_id, institution_id, university_id, threshold_kind, threshold_value)
SELECT 'medicine:bgu:bgu:sekhem', 'medicine', 'bgu', 'bgu', 'sekhem', 735
WHERE NOT EXISTS (SELECT 1 FROM public.admission_thresholds
  WHERE id = 'medicine:bgu:bgu:sekhem'
    OR (program_id = 'medicine' AND institution_id = 'bgu'
      AND university_id = 'bgu' AND threshold_kind = 'sekhem'))
ON CONFLICT DO NOTHING
RETURNING *
)
INSERT INTO hadassah_huji_20261031.inserted_rows (table_name, row_id, row_data)
SELECT 'admission_thresholds', 'medicine:bgu:bgu:sekhem', to_jsonb(inserted) FROM inserted;

-- Historical enquiries remain immutable consent snapshots. Static maps are not
-- database provider columns and are outside this packet's scope.

UPDATE public.institutions SET name = 'המרכז האקדמי הרב תחומי ירושלים', updated_at = now()
WHERE id = 'hadassah' AND name = 'המרכז האקדמי הרב-תחומי ירושלים';
UPDATE public.institutions SET domain = 'jmc.ac.il', updated_at = now()
WHERE id = 'hadassah' AND domain = 'macam.ac.il';
UPDATE public.institutions SET program_url = 'https://www.jmc.ac.il/', updated_at = now()
WHERE id = 'hadassah' AND program_url = 'https://www.macam.ac.il';
UPDATE public.institutions SET domain = 'aac.ac.il', updated_at = now()
WHERE id = 'ashkelon' AND domain = 'ac.il';
UPDATE public.institutions SET program_url = 'https://www.aac.ac.il/', updated_at = now()
WHERE id = 'ashkelon' AND program_url = 'https://www.ac.il';

DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.admission_thresholds t JOIN (VALUES
    ('huji_biology:huji:huji:sekhem', NULL::numeric),
    ('medicine:tau:tau:sekhem', 726.44), ('medicine:huji:huji:sekhem', NULL::numeric),
    ('medicine:biu:biu:sekhem', NULL::numeric),
    ('huji_medicine:huji:huji:sekhem', NULL::numeric),
    ('tau_medicine:tau:tau:sekhem', 726.44), ('biu_medicine:biu:biu:sekhem', NULL::numeric),
    ('medicine:bgu:bgu:sekhem', 735)
  ) expected(id, value) ON t.id = expected.id
    AND t.threshold_value IS NOT DISTINCT FROM expected.value) <> 8 THEN
    RAISE EXCEPTION 'Threshold verification failed';
  END IF;
  IF (SELECT count(*) FROM public.program_institutions
    WHERE program_id = 'medicine' AND institution_id = 'bgu') <> 1 THEN
    RAISE EXCEPTION 'Generic BGU medicine link is missing';
  END IF;
  IF (SELECT count(*) FROM public.institutions WHERE id IN ('hadassah', 'ashkelon')) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two target institutions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'hadassah'
    AND name = 'המרכז האקדמי הרב תחומי ירושלים' AND domain = 'jmc.ac.il'
    AND program_url = 'https://www.jmc.ac.il/')
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'ashkelon'
      AND domain = 'aac.ac.il' AND program_url = 'https://www.aac.ac.il/') THEN
    RAISE EXCEPTION 'Institution identity verification failed';
  END IF;
END $verify$;

-- Save after-images so rollback can refuse to overwrite subsequent changes.
CREATE TABLE hadassah_huji_20261031.thresholds_after AS
SELECT * FROM public.admission_thresholds WHERE id IN
  (SELECT id FROM hadassah_huji_20261031.thresholds_before) OR id = 'medicine:bgu:bgu:sekhem';
CREATE TABLE hadassah_huji_20261031.institutions_after AS
SELECT * FROM public.institutions WHERE id IN (SELECT id FROM hadassah_huji_20261031.institutions_before);
CREATE TABLE hadassah_huji_20261031.links_after AS
SELECT * FROM public.program_institutions WHERE program_id = 'medicine' AND institution_id = 'bgu';

-- Verification output for Mario's application record.
SELECT id, threshold_value FROM hadassah_huji_20261031.thresholds_after ORDER BY id;
SELECT id, name, domain, program_url FROM hadassah_huji_20261031.institutions_after ORDER BY id;
SELECT * FROM hadassah_huji_20261031.links_after;
ROLLBACK;

/*
Rollback after a committed application: owner connection, ON_ERROR_STOP enabled.
Exact prechecked backups restore Ashkelon program_url = 'https://www.ac.il' and
domain = 'ac.il', and Hadassah program_url = 'https://www.macam.ac.il'.
Restore only rows changed by this packet, guarded by id and packet-written values.
Before any restore, the drift guard requires every saved after-image to be intact;
an exception aborts this transaction. Inserted_rows records only actual RETURNING
rows, so a no-op insert creates no deletion authority. Each DELETE also matches
the recorded complete row and refuses to remove a row present in the before-image.
If this packet inserted the BGU link while its 735 threshold already existed,
restore refuses to remove that link: the remaining threshold requires it (0014).
Resolve that membership separately; do not bypass the guard.
Keep the backup schema until the application and rollback window are signed off.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.admission_thresholds, public.institutions,
  public.program_institutions IN SHARE ROW EXCLUSIVE MODE;
DO $rollback_guard$
DECLARE table_pair text[]; live_rows jsonb; saved_rows jsonb;
BEGIN
  FOREACH table_pair SLICE 1 IN ARRAY ARRAY[
    ['admission_thresholds', 'thresholds_after'], ['institutions', 'institutions_after']
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
DELETE FROM public.admission_thresholds t
USING hadassah_huji_20261031.inserted_rows i
WHERE t.id = 'medicine:bgu:bgu:sekhem'
  AND i.table_name = 'admission_thresholds' AND i.row_id = t.id
  AND to_jsonb(t) = i.row_data
  AND NOT EXISTS (SELECT 1 FROM hadassah_huji_20261031.thresholds_before b WHERE b.id = t.id);
DO $restore_link_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM hadassah_huji_20261031.inserted_rows
    WHERE table_name = 'program_institutions' AND row_id = 'medicine:bgu')
    AND EXISTS (SELECT 1 FROM public.admission_thresholds
      WHERE program_id = 'medicine' AND institution_id = 'bgu') THEN
    RAISE EXCEPTION 'Cannot remove inserted medicine:bgu link while thresholds reference it (0014 scope)';
  END IF;
END $restore_link_guard$;
DELETE FROM public.program_institutions t
USING hadassah_huji_20261031.inserted_rows i
WHERE t.program_id = 'medicine' AND t.institution_id = 'bgu'
  AND i.table_name = 'program_institutions' AND i.row_id = 'medicine:bgu'
  AND to_jsonb(t) = i.row_data
  AND NOT EXISTS (SELECT 1 FROM hadassah_huji_20261031.links_before)
  AND NOT EXISTS (SELECT 1 FROM public.admission_thresholds
    WHERE program_id = 'medicine' AND institution_id = 'bgu');
UPDATE public.admission_thresholds t SET threshold_value = b.threshold_value
  FROM hadassah_huji_20261031.thresholds_before b
  JOIN hadassah_huji_20261031.thresholds_after a ON a.id = b.id
  WHERE t.id = b.id AND t.id = a.id
    AND t.threshold_value IS NOT DISTINCT FROM a.threshold_value
    AND to_jsonb(t) IS NOT DISTINCT FROM to_jsonb(a)
    AND b.threshold_value IS DISTINCT FROM a.threshold_value
    AND t.id <> 'medicine:bgu:bgu:sekhem';
UPDATE public.institutions t SET name = b.name, domain = b.domain,
  program_url = b.program_url, updated_at = b.updated_at
  FROM hadassah_huji_20261031.institutions_before b
  JOIN hadassah_huji_20261031.institutions_after a ON a.id = b.id
  WHERE t.id = b.id AND t.id = a.id
    AND t.name IS NOT DISTINCT FROM a.name
    AND t.domain IS NOT DISTINCT FROM a.domain
    AND t.program_url IS NOT DISTINCT FROM a.program_url
    AND to_jsonb(t) IS NOT DISTINCT FROM to_jsonb(a)
    AND ROW(b.name, b.domain, b.program_url) IS DISTINCT FROM ROW(a.name, a.domain, a.program_url);
DO $verify_restore$
DECLARE table_pair text[]; live_rows jsonb; saved_rows jsonb; inserted record;
BEGIN
  FOREACH table_pair SLICE 1 IN ARRAY ARRAY[
    ['admission_thresholds', 'thresholds_before'], ['institutions', 'institutions_before']
  ] LOOP
    EXECUTE format('SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.%I t
      WHERE t.id IN (SELECT id FROM hadassah_huji_20261031.%I)', table_pair[1], table_pair[2]) INTO live_rows;
    EXECUTE format('SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM hadassah_huji_20261031.%I t',
      table_pair[2]) INTO saved_rows;
    IF live_rows IS DISTINCT FROM saved_rows THEN
      RAISE EXCEPTION 'Restore does not equal the before-image in %', table_pair[1];
    END IF;
  END LOOP;
  SELECT jsonb_agg(to_jsonb(t)) INTO live_rows FROM public.program_institutions t
    WHERE program_id = 'medicine' AND institution_id = 'bgu';
  SELECT jsonb_agg(to_jsonb(t)) INTO saved_rows FROM hadassah_huji_20261031.links_before t;
  IF live_rows IS DISTINCT FROM saved_rows THEN
    RAISE EXCEPTION 'Restored BGU membership differs from before-image';
  END IF;
  FOR inserted IN SELECT * FROM hadassah_huji_20261031.inserted_rows LOOP
    IF inserted.table_name = 'admission_thresholds' THEN
      IF EXISTS (SELECT 1 FROM public.admission_thresholds WHERE id = inserted.row_id) THEN
        RAISE EXCEPTION 'Inserted row remains after restore: %', inserted.row_id;
      END IF;
    ELSIF inserted.table_name = 'program_institutions' THEN
      IF EXISTS (SELECT 1 FROM public.program_institutions
        WHERE program_id = 'medicine' AND institution_id = 'bgu') THEN
        RAISE EXCEPTION 'Inserted row remains after restore: %', inserted.row_id;
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown inserted-row table: %', inserted.table_name;
    END IF;
  END LOOP;
END $verify_restore$;
COMMIT;
Repeat the precheck SELECTs to confirm restoration. Do not rerun the forward packet.
*/
