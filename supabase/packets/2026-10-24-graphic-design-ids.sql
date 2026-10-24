-- 2026-10-24: graphic-design identity correction. NOT A MIGRATION. NOT EXECUTED.
-- Jorje only: after merge and production READY, use an owner connection and
-- psql -X -v ON_ERROR_STOP=1 -f supabase/packets/2026-10-24-graphic-design-ids.sql
-- Preview shares production: do not run seeds or historical repair SQL.
-- Sources: jamd.ac.il/dance; jamd.ac.il/acceptance;
-- go.tau.ac.il/he/arts/ba/music; arts.tau.ac.il/music/kabla-I;
-- www.jsfs.co.il/about; www.jsfs.co.il/registration (checked 24.10.2026).
-- rubin_classical belongs to TAU Buchmann-Mehta, not Jerusalem's Rubin academy.
-- B.Dance / B.Mus. are explicit code catalogue fields; no schema migration needed.
-- Retired rows remain unlisted archives to preserve saved/operational foreign keys.
-- Code removes these archives from active results before AND after this packet.
-- No samspiegel_documentary, user, release, freshness or publication rows change.

BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.programs, public.institutions, public.admission_requirements,
  public.program_institutions, public.source_urls, public.admission_thresholds,
  public.admission_facts IN SHARE ROW EXCLUSIVE MODE;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.programs p JOIN (VALUES
      ('jerusalem_academy_graphic_design','jerusalem_academy','מוזיקה ומחול'),
      ('rubin_graphic_design','rubin','מוזיקה'),
      ('spieldocs_graphic_design','spieldocs','קולנוע ותסריטאות'),
      ('rubin_classical','rubin','מוזיקה קלאסית – ביצוע')
    ) expected(id,institution_id,name) ON p.id=expected.id
      AND p.institution_id=expected.institution_id AND p.name=expected.name
      AND p.is_listed) <> 4 THEN
    RAISE EXCEPTION 'Expected four unchanged, listed legacy rows; inspect catalogue drift';
  END IF;
  IF EXISTS (SELECT 1 FROM public.programs WHERE id='jerusalem_academy_dance') THEN
    RAISE EXCEPTION 'Dance destination already exists; do not overwrite or rerun';
  END IF;
  IF (SELECT count(*) FROM public.admission_requirements WHERE
      (program_id='jerusalem_academy_graphic_design' AND institution_id='jerusalem_academy')
      OR (program_id='rubin_classical' AND institution_id='rubin')) <> 2 THEN
    RAISE EXCEPTION 'Expected one requirement row per corrected programme';
  END IF;
  IF (SELECT count(*) FROM public.source_urls WHERE program_id='rubin_classical'
      AND institution_id='rubin' AND kind='program') > 1 THEN
    RAISE EXCEPTION 'Unexpected duplicate TAU programme URLs';
  END IF;
  IF (SELECT count(*) FROM public.institutions WHERE id='spieldocs'
      AND domain IN ('spieldocs.ac.il','www.spieldocs.ac.il','jsfs.co.il','www.jsfs.co.il')) <> 1 THEN
    RAISE EXCEPTION 'Unexpected Sam Spiegel institution identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id='rubin' AND domain='tau.ac.il'
      AND name LIKE '%בוכמן%מהטה%תל אביב%') THEN
    RAISE EXCEPTION 'rubin must identify TAU Buchmann-Mehta';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_thresholds WHERE
      program_id IN ('jerusalem_academy_graphic_design','rubin_classical')
      AND threshold_value IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.admission_facts WHERE
      program_id IN ('jerusalem_academy_graphic_design','rubin_classical')
      AND kind='numeric_gate') THEN
    RAISE EXCEPTION 'Unexpected numeric evidence: inspect instead of deleting it';
  END IF;
END $guard$;

-- BACKUP. Single-use private schema: CREATE without IF NOT EXISTS prevents
-- overwriting the original backup. No runtime/Data API role receives access.
CREATE SCHEMA graphic_design_ids_20261024;
REVOKE ALL ON SCHEMA graphic_design_ids_20261024 FROM PUBLIC, anon, authenticated, app_runtime, ops_readonly;
CREATE TABLE graphic_design_ids_20261024.programs AS SELECT * FROM public.programs
  WHERE id IN ('jerusalem_academy_graphic_design','rubin_graphic_design','spieldocs_graphic_design','rubin_classical');
CREATE TABLE graphic_design_ids_20261024.institutions AS SELECT * FROM public.institutions WHERE id='spieldocs';
CREATE TABLE graphic_design_ids_20261024.admission_requirements AS SELECT * FROM public.admission_requirements
  WHERE program_id IN (SELECT id FROM graphic_design_ids_20261024.programs);
CREATE TABLE graphic_design_ids_20261024.source_urls AS SELECT * FROM public.source_urls
  WHERE program_id IN (SELECT id FROM graphic_design_ids_20261024.programs);
CREATE TABLE graphic_design_ids_20261024.program_institutions AS SELECT * FROM public.program_institutions
  WHERE program_id IN (SELECT id FROM graphic_design_ids_20261024.programs);
CREATE TABLE graphic_design_ids_20261024.after_rows (table_name text PRIMARY KEY, rows jsonb NOT NULL);
CREATE TABLE graphic_design_ids_20261024.state (status text NOT NULL CHECK (status IN ('applied','rolled_back')));
INSERT INTO graphic_design_ids_20261024.state VALUES ('applied');

DO $private$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='graphic_design_ids_20261024' LOOP
    EXECUTE format('ALTER TABLE graphic_design_ids_20261024.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE graphic_design_ids_20261024.%I FROM PUBLIC, anon, authenticated, app_runtime, ops_readonly', t);
  END LOOP;
END $private$;

-- APPLY. All statements below and the backup commit atomically.
DO $apply$
DECLARE n integer;
BEGIN
  INSERT INTO public.programs
  SELECT (jsonb_populate_record(NULL::public.programs, to_jsonb(p) || jsonb_build_object(
    'id','jerusalem_academy_dance','name','תואר ראשון במחול',
    'category','מוזיקה ותיאטרון','type','academic','admission_type','requirements',
    'is_listed',true,'riasec_r',0,'riasec_i',3,'riasec_a',5,
    'riasec_s',3,'riasec_e',2,'riasec_c',1,'created_at',now(),'updated_at',now()
  ))).* FROM public.programs p WHERE id='jerusalem_academy_graphic_design';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Dance insert: expected 1, got %', n; END IF;

  INSERT INTO public.program_institutions (program_id,institution_id)
    VALUES ('jerusalem_academy_dance','jerusalem_academy');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Dance institution link: expected 1, got %', n; END IF;

  INSERT INTO public.admission_requirements
    (id,program_id,institution_id,duration_years,estimated_students_per_year,
     quantitative_min_requirement,english_min_requirement,admission_requirements,
     specific_admission_notes,program_description,review_status)
  VALUES ('jerusalem_academy_dance:jerusalem_academy','jerusalem_academy_dance',
    'jerusalem_academy',4,'',NULL,NULL,ARRAY['בגרות מלאה, מכינה ייעודית מוכרת, מכינת 30+ או השלמת אפיק מעבר מהאוניברסיטה הפתוחה.','נדרשת בחינת כניסה מעשית במחול (אודישן), לפי דרישות הפקולטה למחול.']::text[],ARRAY['בגרות מלאה, מכינה ייעודית מוכרת, מכינת 30+ או השלמת אפיק מעבר מהאוניברסיטה הפתוחה.','נדרשת בחינת כניסה מעשית במחול (אודישן), לפי דרישות הפקולטה למחול.']::text[],NULL,'reviewed');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Dance requirements: expected 1, got %', n; END IF;

  INSERT INTO public.source_urls (id,admission_requirement_id,institution_id,program_id,kind,url)
  VALUES ('jerusalem_academy_dance:jerusalem_academy:program',
    'jerusalem_academy_dance:jerusalem_academy','jerusalem_academy',
    'jerusalem_academy_dance','program','https://jamd.ac.il/dance');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Dance source: expected 1, got %', n; END IF;

  UPDATE public.programs SET name='תואר ראשון במוזיקה', category='מוזיקה ותיאטרון',
    type='academic',admission_type='requirements',updated_at=now() WHERE id='rubin_classical';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'TAU keeper: expected 1, got %', n; END IF;

  UPDATE public.admission_requirements SET duration_years=4,
    admission_requirements=ARRAY['תעודת בגרות ובחינה פסיכומטרית, בהתאם לתנאי הקבלה של אוניברסיטת תל אביב.','בחינות כניסה בתיאוריה, פיתוח שמיעה ומיומנות מקלדת, ובחינה בנגינה או בזמרה או ריאיון לפי המגמה.','מועמדים בעלי כישורים מתאימים הזקוקים להשלמות עשויים להידרש למכינת קיץ ולעמידה בכל דרישותיה לפני תחילת הלימודים.']::text[],specific_admission_notes=ARRAY['תעודת בגרות ובחינה פסיכומטרית, בהתאם לתנאי הקבלה של אוניברסיטת תל אביב.','בחינות כניסה בתיאוריה, פיתוח שמיעה ומיומנות מקלדת, ובחינה בנגינה או בזמרה או ריאיון לפי המגמה.','מועמדים בעלי כישורים מתאימים הזקוקים להשלמות עשויים להידרש למכינת קיץ ולעמידה בכל דרישותיה לפני תחילת הלימודים.']::text[],
    quantitative_min_requirement=NULL,english_min_requirement=NULL,
    program_description=NULL,review_status='reviewed',updated_at=now()
    WHERE program_id='rubin_classical' AND institution_id='rubin';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'TAU requirements: expected 1, got %', n; END IF;

  UPDATE public.source_urls SET url='https://go.tau.ac.il/he/arts/ba/music'
    WHERE program_id='rubin_classical' AND institution_id='rubin' AND kind='program';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n=0 THEN
    INSERT INTO public.source_urls (id,admission_requirement_id,institution_id,program_id,kind,url)
    SELECT 'rubin_classical:rubin:program',id,'rubin','rubin_classical','program',
      'https://go.tau.ac.il/he/arts/ba/music' FROM public.admission_requirements
      WHERE program_id='rubin_classical' AND institution_id='rubin';
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  IF n<>1 THEN RAISE EXCEPTION 'TAU source: expected 1, got %', n; END IF;

  UPDATE public.programs SET is_listed=false,updated_at=now() WHERE id IN
    ('jerusalem_academy_graphic_design','rubin_graphic_design','spieldocs_graphic_design');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>3 THEN RAISE EXCEPTION 'Retirement: expected 3, got %', n; END IF;

  UPDATE public.institutions SET domain='www.jsfs.co.il',program_url='https://www.jsfs.co.il',
    updated_at=now() WHERE id='spieldocs';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Sam Spiegel institution: expected 1, got %', n; END IF;
END $apply$;

-- Record post-apply catalogue snapshots for drift-safe rollback. Saved and
-- operational rows are intentionally excluded: neither apply nor rollback writes them.
DO $snapshots$
DECLARE t text; scope text; sort_key text; snapshot jsonb;
BEGIN
  FOREACH t IN ARRAY ARRAY['programs','institutions','admission_requirements','source_urls','program_institutions'] LOOP
    scope := CASE WHEN t='institutions' THEN 'id=''spieldocs'''
      WHEN t='programs' THEN 'id IN (''jerusalem_academy_graphic_design'',''rubin_graphic_design'',''spieldocs_graphic_design'',''rubin_classical'',''jerusalem_academy_dance'')'
      ELSE 'program_id IN (''jerusalem_academy_graphic_design'',''rubin_graphic_design'',''spieldocs_graphic_design'',''rubin_classical'',''jerusalem_academy_dance'')' END;
    sort_key := CASE WHEN t='program_institutions' THEN 'program_id,institution_id' ELSE 'id' END;
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) FROM (SELECT * FROM public.%I WHERE %s ORDER BY %s) s',t,scope,sort_key) INTO snapshot;
    INSERT INTO graphic_design_ids_20261024.after_rows VALUES (t,snapshot);
  END LOOP;
END $snapshots$;
COMMIT;

-- VERIFICATION SELECTs (read-only). Expect two listed four-year programmes,
-- three unlisted archives, and the jsfs.co.il homepage. Credentials live in code.
SELECT p.id,p.name,p.institution_id,p.is_listed,r.duration_years,r.specific_admission_notes
  FROM public.programs p LEFT JOIN public.admission_requirements r ON r.program_id=p.id
  WHERE p.id IN ('jerusalem_academy_dance','rubin_classical',
    'jerusalem_academy_graphic_design','rubin_graphic_design','spieldocs_graphic_design') ORDER BY p.id;
SELECT id,domain,program_url FROM public.institutions WHERE id='spieldocs';
SELECT program_id,url FROM public.source_urls WHERE kind='program'
  AND program_id IN ('jerusalem_academy_dance','rubin_classical') ORDER BY program_id;
SELECT status FROM graphic_design_ids_20261024.state;

-- ROLLBACK: deliberately commented, never runs with APPLY. Execute separately.
-- Retain the newly allocated dance row and children as an unlisted archive so
-- saves/alerts made after rollout keep their references; restore all original rows.
-- With this code still deployed, the read overlay continues serving corrected content.
/*
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.programs, public.institutions, public.admission_requirements,
  public.program_institutions, public.source_urls IN SHARE ROW EXCLUSIVE MODE;
DO $rollback_guard$
DECLARE t text; scope text; sort_key text; snapshot jsonb; expected jsonb;
BEGIN
  IF (SELECT count(*) FROM graphic_design_ids_20261024.state WHERE status='applied')<>1 THEN
    RAISE EXCEPTION 'Packet not applied or already rolled back';
  END IF;
  FOREACH t IN ARRAY ARRAY['programs','institutions','admission_requirements','source_urls','program_institutions'] LOOP
    scope := CASE WHEN t='institutions' THEN 'id=''spieldocs'''
      WHEN t='programs' THEN 'id IN (''jerusalem_academy_graphic_design'',''rubin_graphic_design'',''spieldocs_graphic_design'',''rubin_classical'',''jerusalem_academy_dance'')'
      ELSE 'program_id IN (''jerusalem_academy_graphic_design'',''rubin_graphic_design'',''spieldocs_graphic_design'',''rubin_classical'',''jerusalem_academy_dance'')' END;
    sort_key := CASE WHEN t='program_institutions' THEN 'program_id,institution_id' ELSE 'id' END;
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) FROM (SELECT * FROM public.%I WHERE %s ORDER BY %s) s',t,scope,sort_key) INTO snapshot;
    SELECT rows INTO expected FROM graphic_design_ids_20261024.after_rows WHERE table_name=t;
    IF snapshot IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Catalogue drift in %, inspect before rollback',t; END IF;
  END LOOP;
END $rollback_guard$;
DO $restore$
DECLARE n integer;
BEGIN
  UPDATE public.programs p SET name=b.name,category=b.category,type=b.type,
    admission_type=b.admission_type,is_listed=b.is_listed,updated_at=b.updated_at
    FROM graphic_design_ids_20261024.programs b WHERE p.id=b.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>4 THEN RAISE EXCEPTION 'Restore programmes: expected 4, got %',n; END IF;

  UPDATE public.programs SET is_listed=false,updated_at=now() WHERE id='jerusalem_academy_dance';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Archive allocated dance ID: expected 1, got %',n; END IF;

  UPDATE public.admission_requirements r SET duration_years=b.duration_years,
    admission_requirements=b.admission_requirements,specific_admission_notes=b.specific_admission_notes,
    quantitative_min_requirement=b.quantitative_min_requirement,english_min_requirement=b.english_min_requirement,
    program_description=b.program_description,review_status=b.review_status,updated_at=b.updated_at
    FROM graphic_design_ids_20261024.admission_requirements b
    WHERE r.id=b.id AND r.program_id='rubin_classical';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Restore TAU requirements: expected 1, got %',n; END IF;

  DELETE FROM public.source_urls s WHERE s.program_id='rubin_classical' AND s.kind='program'
    AND NOT EXISTS (SELECT 1 FROM graphic_design_ids_20261024.source_urls b WHERE b.id=s.id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>(CASE WHEN EXISTS (SELECT 1 FROM graphic_design_ids_20261024.source_urls
      WHERE program_id='rubin_classical' AND kind='program') THEN 0 ELSE 1 END) THEN
    RAISE EXCEPTION 'Unexpected allocated TAU source count: %',n;
  END IF;
  UPDATE public.source_urls s SET url=b.url FROM graphic_design_ids_20261024.source_urls b
    WHERE s.id=b.id AND s.program_id='rubin_classical' AND s.kind='program';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>(SELECT count(*) FROM graphic_design_ids_20261024.source_urls
      WHERE program_id='rubin_classical' AND kind='program') THEN
    RAISE EXCEPTION 'Unexpected restored TAU source count: %',n;
  END IF;

  UPDATE public.institutions i SET domain=b.domain,program_url=b.program_url,updated_at=b.updated_at
    FROM graphic_design_ids_20261024.institutions b WHERE i.id=b.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Restore institution: expected 1, got %',n; END IF;

  UPDATE graphic_design_ids_20261024.state SET status='rolled_back';
END $restore$;
COMMIT;
-- Repeat the verification SELECTs above. Original four rows are listed again;
-- the newly allocated dance ID is unlisted and retains any saved references.
SELECT status FROM graphic_design_ids_20261024.state;
*/
