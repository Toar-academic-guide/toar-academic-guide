-- Issue #370: reviewable, one-shot Reichman catalogue publication packet.
-- NOT executed against production by this PR. Apply only after the source PR
-- is merged, the deployment is READY, and the reviewed before snapshot is
-- reconfirmed. Any drift raises an exception and rolls back the transaction.
-- Only six admission_requirements rows and their six kind=program source_urls
-- are updated. Calculator/institution URLs, thresholds, IDs, and formulas stay.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TEMP TABLE issue370_expected (
  requirement_id text PRIMARY KEY,
  program_id text NOT NULL,
  before_duration real,
  before_cohort text NOT NULL,
  after_duration real,
  after_requirements text[] NOT NULL,
  after_notes text[] NOT NULL,
  after_program_url text NOT NULL
) ON COMMIT DROP;

INSERT INTO issue370_expected VALUES
  (
    'reichman_cs:reichman', 'reichman_cs', 3, 'כ-150 סטודנטים', 3,
    ARRAY[]::text[],
    ARRAY[
      'ציון מתואם 705 ומעלה ופסיכומטרי 660 ומעלה, או ממוצע בגרות 108 ומעלה, או פסיכומטרי 720 ומעלה עם זכאות לבגרות.',
      'במסלולי מתואם ובגרות: מתמטיקה 5 יחידות בציון 85 ומעלה. במסלול בגרות נדרשות גם 5 יחידות בפיזיקה, כימיה, ביולוגיה או מדעי המחשב (לא תכנון מערכות) בציון 85 ומעלה.',
      'במסלול פסיכומטרי: מתמטיקה 5 יחידות בציון 80 ומעלה. קיימות גם אפשרויות קבלה הכוללות קורס הכנה במתמטיקה.'
    ]::text[],
    'https://www.runi.ac.il/schools/computer-science/undergraduate/?utm_source=myway&utm_medium=referral'
  ),
  (
    'reichman_psychology:reichman', 'reichman_psychology', 4, 'כ-120 סטודנטים', 3,
    ARRAY[]::text[],
    ARRAY[
      'ציון מתואם 620 ומעלה, או ממוצע בגרות 100 ומעלה, או פסיכומטרי 640 ומעלה עם זכאות לבגרות.',
      'מתמטיקה: 3 יחידות לפחות בציון 85 ומעלה. אנגלית: 4 יחידות לפחות בציון 90 ומעלה.'
    ]::text[],
    'https://www.runi.ac.il/schools/psychology/undergraduate/?utm_source=myway&utm_medium=referral'
  ),
  (
    'reichman_law:reichman', 'reichman_law', 3, 'כ-180 סטודנטים', 4,
    ARRAY[]::text[],
    ARRAY[
      'ציון מתואם 650 ומעלה ופסיכומטרי 610 ומעלה, או ממוצע בגרות 100 ומעלה, או פסיכומטרי 700 ומעלה עם זכאות לבגרות.'
    ]::text[],
    'https://www.runi.ac.il/schools/law/undergraduate/?utm_source=myway&utm_medium=referral'
  ),
  (
    'reichman_business:reichman', 'reichman_business', 3, 'כ-200 סטודנטים', 3,
    ARRAY[
      'ציון מתואם 630 לפחות המחושב מהבגרות והפסיכומטרי, או ממוצע בגרות 100 ומעלה, או פסיכומטרי 700 לפחות',
      'אנגלית 4 יחידות לפחות; במסלולי בגרות 100 ומתואם: מתמטיקה ברמת 3 יחידות בציון 100; במסלול הפסיכומטרי: כמותי 125 ומעלה',
      'חלופת בגרות 95–99: מתמטיקה 4 יחידות לפחות בציון 80 ומקצוע מדעי 5 יחידות בציון 75 לפחות',
      'ייתכן קורס הכנה במתמטיקה לפי היחידות והציון; נדרש אישור זכאות לבגרות ודרישות שפה'
    ]::text[],
    ARRAY[
      'ציון מתואם 630 לפחות המחושב מהבגרות והפסיכומטרי, או ממוצע בגרות 100 ומעלה, או פסיכומטרי 700 לפחות',
      'אנגלית 4 יחידות לפחות; במסלולי בגרות 100 ומתואם: מתמטיקה ברמת 3 יחידות בציון 100; במסלול הפסיכומטרי: כמותי 125 ומעלה',
      'חלופת בגרות 95–99: מתמטיקה 4 יחידות לפחות בציון 80 ומקצוע מדעי 5 יחידות בציון 75 לפחות',
      'ייתכן קורס הכנה במתמטיקה לפי היחידות והציון; נדרש אישור זכאות לבגרות ודרישות שפה'
    ]::text[],
    'https://www.runi.ac.il/schools/business/undergraduate/ba/?utm_source=myway&utm_medium=referral'
  ),
  (
    'reichman_economics:reichman', 'reichman_economics', 3, 'כ-160 סטודנטים', 3,
    ARRAY[
      'ציון מתואם 600 לפחות המחושב מהבגרות והפסיכומטרי, או ממוצע בגרות 100 ומעלה, או פסיכומטרי 680 לפחות',
      'אנגלית 4 יחידות לפחות ומתמטיקה 4 יחידות בציון 75 או 5 יחידות בציון 60; במסלול הפסיכומטרי גם כמותי 125 ומעלה',
      'מתמטיקה מתחת ל־4 יחידות בציון 85 או 5 יחידות בציון 65 מחייבת קורס הכנה; נדרש אישור זכאות לבגרות ודרישות שפה'
    ]::text[],
    ARRAY[
      'ציון מתואם 600 לפחות המחושב מהבגרות והפסיכומטרי, או ממוצע בגרות 100 ומעלה, או פסיכומטרי 680 לפחות',
      'אנגלית 4 יחידות לפחות ומתמטיקה 4 יחידות בציון 75 או 5 יחידות בציון 60; במסלול הפסיכומטרי גם כמותי 125 ומעלה',
      'מתמטיקה מתחת ל־4 יחידות בציון 85 או 5 יחידות בציון 65 מחייבת קורס הכנה; נדרש אישור זכאות לבגרות ודרישות שפה'
    ]::text[],
    'https://www.runi.ac.il/schools/economics/undergraduate/?utm_source=myway&utm_medium=referral'
  ),
  (
    'reichman_infosystems:reichman', 'reichman_infosystems', 3, 'כ-140 סטודנטים', NULL,
    ARRAY['בדקו את תנאי המסלול באתר רייכמן']::text[],
    ARRAY[]::text[],
    'https://www.runi.ac.il/admissions/undergraduate/'
  );

DO $issue370$
DECLARE
  matching_rows integer;
  changed_rows integer;
BEGIN
  IF (SELECT count(*) FROM issue370_expected) <> 6 THEN
    RAISE EXCEPTION 'issue370 expected six scoped rows';
  END IF;

  PERFORM 1
  FROM public.admission_requirements ar
  JOIN issue370_expected e ON e.requirement_id = ar.id
  FOR UPDATE OF ar;
  PERFORM 1
  FROM public.source_urls s
  JOIN issue370_expected e ON s.admission_requirement_id = e.requirement_id
  FOR UPDATE OF s;

  SELECT count(*) INTO matching_rows
  FROM issue370_expected e
  JOIN public.admission_requirements ar
    ON ar.id = e.requirement_id
   AND ar.program_id = e.program_id
   AND ar.institution_id = 'reichman'
  WHERE ar.duration_years IS NOT DISTINCT FROM e.before_duration
    AND ar.estimated_students_per_year IS NOT DISTINCT FROM e.before_cohort
    AND ar.quantitative_min_requirement IS NULL
    AND ar.english_min_requirement IS NULL
    AND ar.admission_requirements = ARRAY[]::text[]
    AND ar.specific_admission_notes = ARRAY[
      $he$חובה ממוצע בגרות 100 ומעלה לקבלה ישירה במסלול המבוקש$he$,
      $he$מותנה ברמת אנגלית 'מתקדמים א' לפחות או ציון אמיר"ם/פסיכומטרי תואם$he$
    ]::text[]
    AND ar.program_description IS NULL
    AND ar.review_status = 'seeded'
    AND ar.updated_at = '2026-07-04 12:19:02.656611+00'::timestamptz;
  IF matching_rows <> 6 THEN
    RAISE EXCEPTION 'issue370 admission row drift: matched %, expected 6', matching_rows;
  END IF;

  SELECT count(*) INTO matching_rows
  FROM issue370_expected e
  JOIN public.source_urls p
    ON p.id = e.requirement_id || ':program'
   AND p.admission_requirement_id = e.requirement_id
   AND p.program_id = e.program_id
   AND p.institution_id = 'reichman'
   AND p.kind = 'program'
   AND p.url = 'https://www.runi.ac.il'
  JOIN public.source_urls c
    ON c.id = e.requirement_id || ':calculator'
   AND c.admission_requirement_id = e.requirement_id
   AND c.program_id = e.program_id
   AND c.institution_id = 'reichman'
   AND c.kind = 'calculator'
   AND c.url = 'https://www.runi.ac.il/admissions/undergraduate/'
  JOIN public.source_urls i
    ON i.id = e.requirement_id || ':institution'
   AND i.admission_requirement_id = e.requirement_id
   AND i.program_id = e.program_id
   AND i.institution_id = 'reichman'
   AND i.kind = 'institution'
   AND i.url = 'https://www.runi.ac.il';
  IF matching_rows <> 6 OR (
    SELECT count(*) FROM public.source_urls
    WHERE admission_requirement_id IN (SELECT requirement_id FROM issue370_expected)
  ) <> 18 THEN
    RAISE EXCEPTION 'issue370 source URL drift: matched %, expected six triplets', matching_rows;
  END IF;

  UPDATE public.admission_requirements ar
  SET duration_years = e.after_duration,
      estimated_students_per_year = '',
      admission_requirements = e.after_requirements,
      specific_admission_notes = e.after_notes,
      updated_at = now()
  FROM issue370_expected e
  WHERE ar.id = e.requirement_id;
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 6 THEN
    RAISE EXCEPTION 'issue370 admission update count %, expected 6', changed_rows;
  END IF;

  UPDATE public.source_urls s
  SET url = e.after_program_url
  FROM issue370_expected e
  WHERE s.id = e.requirement_id || ':program';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 6 THEN
    RAISE EXCEPTION 'issue370 program URL update count %, expected 6', changed_rows;
  END IF;

  SELECT count(*) INTO matching_rows
  FROM issue370_expected e
  JOIN public.admission_requirements ar ON ar.id = e.requirement_id
  JOIN public.source_urls p ON p.id = e.requirement_id || ':program'
  JOIN public.source_urls c ON c.id = e.requirement_id || ':calculator'
  JOIN public.source_urls i ON i.id = e.requirement_id || ':institution'
  WHERE ar.program_id = e.program_id AND ar.institution_id = 'reichman'
    AND ar.duration_years IS NOT DISTINCT FROM e.after_duration
    AND ar.estimated_students_per_year = ''
    AND ar.admission_requirements = e.after_requirements
    AND ar.specific_admission_notes = e.after_notes
    AND p.url = e.after_program_url
    AND c.url = 'https://www.runi.ac.il/admissions/undergraduate/'
    AND i.url = 'https://www.runi.ac.il';
  IF matching_rows <> 6 THEN
    RAISE EXCEPTION 'issue370 after-state mismatch: matched %, expected 6', matching_rows;
  END IF;
END
$issue370$;

COMMIT;
