-- FILE ONLY. Jorje owns execution after deployment and backup verification.
-- Repair: changes only specific_admission_notes on the two BGU business rows.
-- The final ROLLBACK is deliberate. Replace it with COMMIT only after inspecting verification results.
BEGIN;

DO $bgu_business_notes$
DECLARE
  changed_rows integer;
BEGIN
  IF (SELECT count(*) FROM public.admission_requirements WHERE institution_id = 'bgu' AND program_id IN ('business', 'bgu_business')) <> 2
     OR (SELECT count(DISTINCT program_id) FROM public.admission_requirements WHERE institution_id = 'bgu' AND program_id IN ('business', 'bgu_business')) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly one BGU requirement row for each business ID';
  END IF;

  UPDATE public.admission_requirements
  SET specific_admission_notes = ARRAY[
      'במסלול כלכלה חד־מחלקתי – מנהל עסקים: סכם כמותי 620 לפחות וגם פסיכומטרי 600 לפחות. אפיק נוסף: סכם כמותי 640 ופסיכומטרי 570 לפחות.',
      'מתמטיקה: 4 יחידות בציון 75 לפחות או 5 יחידות בציון 65 לפחות. רכיב כמותי 130 בפסיכומטרי מחליף דרישה זו אם יש ציון עובר ב־4 או 5 יחידות.',
      'ללא פסיכומטרי: ממוצע בגרות 107 לפחות ומתמטיקה 5 יחידות בציון 75 לפחות או 4 יחידות בציון 85 לפחות. אפיק נוסף: ממוצע 107 ורכיב כמותי 130 לפחות, עם ציון עובר ב־4 או 5 יחידות מתמטיקה.',
      'מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 87 יכולה להחליף את ממוצע הבגרות באפיק הבגרות.',
      'נדרשת אנגלית ברמת בסיסי ועברית ברמה ה׳ למי שחייבים בסיווג בעברית.',
      'קורס מבוא למתמטיקה בסמסטר א׳ נדרש למתקבלים עם 4 יחידות בציון 75–84, 5 יחידות בציון 65–74, או על בסיס רכיב כמותי 130 לפחות.',
      'ב־25.08.2026 הודיעה המחלקה שמכסת המתקבלים התמלאה; היא עדיין ממליצה להירשם למי שעומדים בתנאי הקבלה.',
      'אפשר לבקש דיון בחריגים עד 20 נקודות מתחת לספי הפסיכומטרי והסכם, בכפוף לדרישות השפה ולמקום פנוי.'
    ]::text[]
  WHERE institution_id = 'bgu' AND program_id IN ('business', 'bgu_business')
    AND specific_admission_notes = ARRAY[
      'בניהול חד־מחלקתי במגמות מימון, שיווק או יזמות: סכם 580 לפחות או פסיכומטרי 580 לפחות; ללא פסיכומטרי נדרש ממוצע בגרות 103 לפחות.',
      'בניהול דו־מחלקתי: סכם 600 לפחות או פסיכומטרי 600 לפחות; ללא פסיכומטרי נדרש ממוצע בגרות 105 לפחות.',
      'בשני המסלולים: מתמטיקה 4 יחידות בציון 70 או 5 יחידות בציון 60, אנגלית ברמת בסיסי ועברית ברמה ה׳ לנדרשים.',
      'מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 75 יכולה להחליף את הבגרות. לפני סגירת ההרשמה לקורס הקיץ אפשר להשלים את דרישת המתמטיקה בקורס מבוא לשיטות כמותיות.',
      'במחזור תשפ״ז מכסות הקבלה התמלאו. ההרשמה למועמדים שעומדים בתנאים היא על בסיס מקום שיתפנה; קיימת אפשרות לדיון בחריגים לפי תנאי המסלול.'
    ]::text[];

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 2 THEN
    RAISE EXCEPTION 'Expected to repair 2 BGU business rows, changed %; transaction aborted', changed_rows;
  END IF;
END;
$bgu_business_notes$;

SELECT id, program_id, institution_id, specific_admission_notes,
  specific_admission_notes = ARRAY[
      'במסלול כלכלה חד־מחלקתי – מנהל עסקים: סכם כמותי 620 לפחות וגם פסיכומטרי 600 לפחות. אפיק נוסף: סכם כמותי 640 ופסיכומטרי 570 לפחות.',
      'מתמטיקה: 4 יחידות בציון 75 לפחות או 5 יחידות בציון 65 לפחות. רכיב כמותי 130 בפסיכומטרי מחליף דרישה זו אם יש ציון עובר ב־4 או 5 יחידות.',
      'ללא פסיכומטרי: ממוצע בגרות 107 לפחות ומתמטיקה 5 יחידות בציון 75 לפחות או 4 יחידות בציון 85 לפחות. אפיק נוסף: ממוצע 107 ורכיב כמותי 130 לפחות, עם ציון עובר ב־4 או 5 יחידות מתמטיקה.',
      'מכינה למדעים מדויקים והנדסה או למדעי הטבע והחיים של בן־גוריון בממוצע 87 יכולה להחליף את ממוצע הבגרות באפיק הבגרות.',
      'נדרשת אנגלית ברמת בסיסי ועברית ברמה ה׳ למי שחייבים בסיווג בעברית.',
      'קורס מבוא למתמטיקה בסמסטר א׳ נדרש למתקבלים עם 4 יחידות בציון 75–84, 5 יחידות בציון 65–74, או על בסיס רכיב כמותי 130 לפחות.',
      'ב־25.08.2026 הודיעה המחלקה שמכסת המתקבלים התמלאה; היא עדיין ממליצה להירשם למי שעומדים בתנאי הקבלה.',
      'אפשר לבקש דיון בחריגים עד 20 נקודות מתחת לספי הפסיכומטרי והסכם, בכפוף לדרישות השפה ולמקום פנוי.'
    ]::text[] AS notes_match
FROM public.admission_requirements
WHERE institution_id = 'bgu' AND program_id IN ('business', 'bgu_business')
ORDER BY program_id, id;

ROLLBACK;
