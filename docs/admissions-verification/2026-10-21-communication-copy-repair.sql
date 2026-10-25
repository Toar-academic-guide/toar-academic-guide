-- Approved scope: descriptive copy and direct source URL only. No admission logic changes.
-- Apply to shared preview/production only with explicit approval, inside a transaction.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admission_requirements WHERE id='communication:tau' AND specific_admission_notes IN ('{}'::text[], ARRAY['נדרשת עמידה בדרישות האוניברסיטה לבגרות או לתעודה שקולה, לעברית ולאנגלית, ובאחד מאפיקי הקבלה הבאים.','ציון התאמה העומד בסף החוג. אפשר לקבל תוספת של 5 נקודות עבור קורס מקוון מוכר אחד, או 10 נקודות עבור שניים, בציון 85 לפחות בכל קורס.','ללא פסיכומטרי: ממוצע בגרות 102 ומעלה; או תואר ראשון ממוסד מוכר בממוצע 80 לפחות; או תואר שני ממוסד מוכר בממוצע 85 לפחות; או תואר שלישי.','פסיכומטרי כללי 640 ומעלה וזכאות לבגרות.','לימודים אקדמיים חלקיים במוסד מוכר: לפחות 30 שעות סמסטריאליות בממוצע 85 ומעלה, ופסיכומטרי כללי 520 לפחות.','אפיק נוסף לבעלי תואר ראשון ממוסד מוכר: פסיכומטרי כללי 600 לפחות.','הלימודים דו־חוגיים, ויש לעמוד גם בתנאי החוג השני. קיים שילוב עם משפטים במסגרת לימודים לאחר תואר.','ההרשמה לחוג מתקיימת בסמסטר א׳ בלבד.']::text[])) THEN
    RAISE EXCEPTION 'Communication notes changed since review';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM source_urls WHERE id='communication:tau:program' AND url IN ('https://www.tau.ac.il','https://go.tau.ac.il/he/social-sciences/ba/communications?v=requirements')) THEN
    RAISE EXCEPTION 'Communication source changed since review';
  END IF;
  UPDATE admission_requirements SET specific_admission_notes=ARRAY['נדרשת עמידה בדרישות האוניברסיטה לבגרות או לתעודה שקולה, לעברית ולאנגלית, ובאחד מאפיקי הקבלה הבאים.','ציון התאמה העומד בסף החוג. אפשר לקבל תוספת של 5 נקודות עבור קורס מקוון מוכר אחד, או 10 נקודות עבור שניים, בציון 85 לפחות בכל קורס.','ללא פסיכומטרי: ממוצע בגרות 102 ומעלה; או תואר ראשון ממוסד מוכר בממוצע 80 לפחות; או תואר שני ממוסד מוכר בממוצע 85 לפחות; או תואר שלישי.','פסיכומטרי כללי 640 ומעלה וזכאות לבגרות.','לימודים אקדמיים חלקיים במוסד מוכר: לפחות 30 שעות סמסטריאליות בממוצע 85 ומעלה, ופסיכומטרי כללי 520 לפחות.','אפיק נוסף לבעלי תואר ראשון ממוסד מוכר: פסיכומטרי כללי 600 לפחות.','הלימודים דו־חוגיים, ויש לעמוד גם בתנאי החוג השני. קיים שילוב עם משפטים במסגרת לימודים לאחר תואר.','ההרשמה לחוג מתקיימת בסמסטר א׳ בלבד.']::text[] WHERE id='communication:tau';
  UPDATE source_urls SET url='https://go.tau.ac.il/he/social-sciences/ba/communications?v=requirements' WHERE id='communication:tau:program';
END $$;
