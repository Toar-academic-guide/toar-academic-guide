BEGIN;

-- Review packet only. Run against a fresh, verified backup and recheck current
-- rows immediately before a separately authorized publication. COMMIT is never
-- the default. The backup schema persists only if that publication commits.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE public.institutions, public.programs, public.program_institutions,
  public.admission_requirements, public.requirement_versions, public.source_urls,
  public.admission_thresholds, public.admission_facts,
  public.admissions_source_candidates, public.admission_alternative_paths,
  public.admission_alert_subscriptions, public.admission_operational_proof_values,
  public.admission_target_transitions, public.ingestion_sources,
  public.university_calculator_configs, public.review_items
  IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'hadassah_consolidation_20261108') THEN
    RAISE EXCEPTION 'Backup schema already exists; inspect it before retrying';
  END IF;
  IF (SELECT count(*) FROM public.institutions WHERE id IN ('hadassah', 'mon_12220685569')) <> 2
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'hadassah'
      AND name = 'המרכז האקדמי הרב תחומי ירושלים' AND domain = 'jmc.ac.il'
      AND program_url = 'https://www.jmc.ac.il/')
    OR NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'mon_12220685569'
      AND name = 'המכללה האקדמית הדסה ירושלים' AND domain = 'www.hac.ac.il'
      AND program_url = 'https://www.hac.ac.il') THEN
    RAISE EXCEPTION 'Hadassah institution identities differ from the reviewed inventory';
  END IF;
  IF (SELECT count(*) FROM public.programs WHERE institution_id = 'mon_12220685569') <> 1
    OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'mon_12220685569_cs'
      AND name = 'מדעי המחשב - המכללה האקדמית הדסה ירושלים'
      AND institution_name = 'המכללה האקדמית הדסה ירושלים'
      AND institution_id = 'mon_12220685569' AND is_listed)
    OR (SELECT count(*) FROM public.program_institutions
        WHERE program_id = 'mon_12220685569_cs') <> 1
    OR NOT EXISTS (SELECT 1 FROM public.program_institutions
        WHERE program_id = 'mon_12220685569_cs' AND institution_id = 'mon_12220685569')
    OR (SELECT count(*) FROM public.admission_requirements
        WHERE program_id = 'mon_12220685569_cs') <> 1
    OR NOT EXISTS (SELECT 1 FROM public.admission_requirements
        WHERE id = 'mon_12220685569_cs:mon_12220685569'
        AND program_id = 'mon_12220685569_cs' AND institution_id = 'mon_12220685569')
    OR EXISTS (SELECT 1 FROM public.admission_requirements
        WHERE id = 'mon_12220685569_cs:hadassah')
    OR (SELECT count(*) FROM public.requirement_versions
        WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569') <> 1
    OR NOT EXISTS (SELECT 1 FROM public.requirement_versions
        WHERE id = 'mon_12220685569_cs:mon_12220685569:v1')
    OR EXISTS (SELECT 1 FROM public.requirement_versions
        WHERE id = 'mon_12220685569_cs:hadassah:v1')
    OR (SELECT count(*) FROM public.source_urls
        WHERE program_id = 'mon_12220685569_cs') <> 3
    OR (SELECT count(DISTINCT kind) FROM public.source_urls
        WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569'
          AND institution_id = 'mon_12220685569') <> 3
    OR (SELECT count(*) FROM public.source_urls
        WHERE id IN ('mon_12220685569_cs:mon_12220685569:program',
          'mon_12220685569_cs:mon_12220685569:calculator',
          'mon_12220685569_cs:mon_12220685569:institution')) <> 3
    OR EXISTS (SELECT 1 FROM public.source_urls
        WHERE id LIKE 'mon_12220685569_cs:hadassah:%') THEN
    RAISE EXCEPTION 'Hadassah programme, requirement, version or URL shape differs from the reviewed inventory';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_thresholds
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.admission_facts
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.admissions_source_candidates
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.admission_alternative_paths
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.admission_alert_subscriptions
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.admission_operational_proof_values
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.admission_target_transitions
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.ingestion_sources
      WHERE institution_id = 'mon_12220685569' OR program_id = 'mon_12220685569_cs')
    OR EXISTS (SELECT 1 FROM public.university_calculator_configs
      WHERE institution_id = 'mon_12220685569')
    OR EXISTS (SELECT 1 FROM public.review_items
      WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569') THEN
    RAISE EXCEPTION 'Unexpected dependent rows; inventory and revise this packet before publication';
  END IF;
END $$;

CREATE SCHEMA hadassah_consolidation_20261108;
REVOKE ALL ON SCHEMA hadassah_consolidation_20261108 FROM PUBLIC;
CREATE TABLE hadassah_consolidation_20261108.institutions_before AS
  SELECT * FROM public.institutions WHERE id = 'mon_12220685569';
CREATE TABLE hadassah_consolidation_20261108.programs_before AS
  SELECT * FROM public.programs WHERE id = 'mon_12220685569_cs';
CREATE TABLE hadassah_consolidation_20261108.links_before AS
  SELECT * FROM public.program_institutions
  WHERE program_id = 'mon_12220685569_cs';
CREATE TABLE hadassah_consolidation_20261108.requirements_before AS
  SELECT * FROM public.admission_requirements
  WHERE id = 'mon_12220685569_cs:mon_12220685569';
CREATE TABLE hadassah_consolidation_20261108.versions_before AS
  SELECT * FROM public.requirement_versions
  WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569';
CREATE TABLE hadassah_consolidation_20261108.urls_before AS
  SELECT * FROM public.source_urls WHERE program_id = 'mon_12220685569_cs';

INSERT INTO public.admission_requirements
SELECT (jsonb_populate_record(
  NULL::public.admission_requirements,
  to_jsonb(r) || jsonb_build_object('id', 'mon_12220685569_cs:hadassah',
    'institution_id', 'hadassah')
)).*
FROM hadassah_consolidation_20261108.requirements_before r;

UPDATE public.requirement_versions
SET id = 'mon_12220685569_cs:hadassah:v1',
    admission_requirement_id = 'mon_12220685569_cs:hadassah'
WHERE id = 'mon_12220685569_cs:mon_12220685569:v1';

UPDATE public.source_urls
SET id = replace(id, ':mon_12220685569:', ':hadassah:'),
    admission_requirement_id = 'mon_12220685569_cs:hadassah',
    institution_id = 'hadassah',
    url = CASE kind
      WHEN 'calculator' THEN 'https://www.jmc.ac.il/ללמוד-אצלנו/הרשמה-ללימודים/מחשבון-מתאם/'
      WHEN 'institution' THEN 'https://www.jmc.ac.il/'
      ELSE url
    END
WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569';

DELETE FROM public.admission_requirements
WHERE id = 'mon_12220685569_cs:mon_12220685569';

UPDATE public.program_institutions SET institution_id = 'hadassah'
WHERE program_id = 'mon_12220685569_cs' AND institution_id = 'mon_12220685569';

UPDATE public.programs
SET name = 'מדעי המחשב - המרכז האקדמי הרב תחומי ירושלים',
    institution_name = 'המרכז האקדמי הרב תחומי ירושלים',
    institution_id = 'hadassah',
    updated_at = now()
WHERE id = 'mon_12220685569_cs' AND institution_id = 'mon_12220685569';

DELETE FROM public.institutions WHERE id = 'mon_12220685569';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.institutions WHERE id = 'mon_12220685569')
    OR NOT EXISTS (SELECT 1 FROM public.programs
      WHERE id = 'mon_12220685569_cs' AND institution_id = 'hadassah'
        AND name = 'מדעי המחשב - המרכז האקדמי הרב תחומי ירושלים' AND is_listed)
    OR (SELECT count(*) FROM public.program_institutions
      WHERE program_id = 'mon_12220685569_cs' AND institution_id = 'hadassah') <> 1
    OR (SELECT count(*) FROM public.admission_requirements
      WHERE program_id = 'mon_12220685569_cs' AND institution_id = 'hadassah') <> 1
    OR (SELECT count(*) FROM public.requirement_versions
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah') <> 1
    OR (SELECT count(*) FROM public.source_urls
      WHERE program_id = 'mon_12220685569_cs'
        AND institution_id = 'hadassah'
        AND admission_requirement_id = 'mon_12220685569_cs:hadassah') <> 3 THEN
    RAISE EXCEPTION 'Hadassah consolidation postcheck failed';
  END IF;
END $$;

SELECT id, name, institution_id, is_listed FROM public.programs
WHERE id = 'mon_12220685569_cs';
SELECT id, program_id, institution_id FROM public.admission_requirements
WHERE program_id = 'mon_12220685569_cs';
SELECT id, name FROM public.institutions
WHERE id IN ('hadassah', 'mon_12220685569');

ROLLBACK;
