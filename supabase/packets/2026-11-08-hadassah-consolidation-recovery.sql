BEGIN;

-- For a separately authorized recovery after publication. The backup schema
-- must be the one committed by the consolidation packet. Default is ROLLBACK.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.institutions, public.programs, public.program_institutions,
  public.admission_requirements, public.requirement_versions, public.source_urls,
  public.admission_facts, public.admissions_source_candidates,
  public.admission_alternative_paths, public.review_items
  IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF (SELECT count(*) FROM hadassah_consolidation_20261108.institutions_before) <> 1
    OR (SELECT count(*) FROM hadassah_consolidation_20261108.programs_before) <> 1
    OR (SELECT count(*) FROM hadassah_consolidation_20261108.links_before) <> 1
    OR (SELECT count(*) FROM hadassah_consolidation_20261108.requirements_before) <> 1
    OR (SELECT count(*) FROM hadassah_consolidation_20261108.versions_before) <> 1
    OR (SELECT count(*) FROM hadassah_consolidation_20261108.urls_before) <> 3
    OR EXISTS (SELECT 1 FROM public.institutions WHERE id = 'mon_12220685569')
    OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'mon_12220685569_cs'
      AND institution_id = 'hadassah' AND is_listed)
    OR NOT EXISTS (SELECT 1 FROM public.admission_requirements
      WHERE id = 'mon_12220685569_cs:hadassah')
    OR (SELECT count(*) FROM public.requirement_versions
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah') <> 1
    OR (SELECT count(*) FROM public.source_urls
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah') <> 3
    OR EXISTS (SELECT 1 FROM public.admission_facts
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah')
    OR EXISTS (SELECT 1 FROM public.admissions_source_candidates
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah')
    OR EXISTS (SELECT 1 FROM public.admission_alternative_paths
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah')
    OR EXISTS (SELECT 1 FROM public.review_items
      WHERE admission_requirement_id = 'mon_12220685569_cs:hadassah') THEN
    RAISE EXCEPTION 'Recovery precheck failed; inspect current rows and backup before retrying';
  END IF;
END $$;

INSERT INTO public.institutions
SELECT * FROM hadassah_consolidation_20261108.institutions_before;
INSERT INTO public.admission_requirements
SELECT * FROM hadassah_consolidation_20261108.requirements_before;

UPDATE public.requirement_versions v
SET id = b.id,
    admission_requirement_id = b.admission_requirement_id,
    source_snapshot = b.source_snapshot
FROM hadassah_consolidation_20261108.versions_before b
WHERE v.id = 'mon_12220685569_cs:hadassah:v1';

UPDATE public.source_urls u
SET id = b.id,
    admission_requirement_id = b.admission_requirement_id,
    institution_id = b.institution_id,
    url = b.url
FROM hadassah_consolidation_20261108.urls_before b
WHERE u.program_id = 'mon_12220685569_cs' AND u.kind = b.kind;

DELETE FROM public.admission_requirements
WHERE id = 'mon_12220685569_cs:hadassah';

UPDATE public.program_institutions p
SET institution_id = b.institution_id
FROM hadassah_consolidation_20261108.links_before b
WHERE p.program_id = b.program_id AND p.institution_id = 'hadassah';

UPDATE public.programs p
SET name = b.name,
    institution_name = b.institution_name,
    institution_id = b.institution_id,
    updated_at = b.updated_at
FROM hadassah_consolidation_20261108.programs_before b
WHERE p.id = b.id AND p.institution_id = 'hadassah';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = 'mon_12220685569')
    OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = 'mon_12220685569_cs'
      AND institution_id = 'mon_12220685569' AND is_listed)
    OR (SELECT count(*) FROM public.program_institutions
      WHERE program_id = 'mon_12220685569_cs' AND institution_id = 'mon_12220685569') <> 1
    OR (SELECT count(*) FROM public.admission_requirements
      WHERE id = 'mon_12220685569_cs:mon_12220685569') <> 1
    OR (SELECT count(*) FROM public.requirement_versions
      WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569') <> 1
    OR (SELECT count(*) FROM public.source_urls
      WHERE admission_requirement_id = 'mon_12220685569_cs:mon_12220685569') <> 3 THEN
    RAISE EXCEPTION 'Recovery postcheck failed';
  END IF;
END $$;

SELECT id, name, institution_id FROM public.programs
WHERE id = 'mon_12220685569_cs';
ROLLBACK;
