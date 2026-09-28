-- Official TAU undergraduate search and the complete BGU 2027 admission feed
-- contain no Nutrition programme. Keep the parent ID so saved_programs survive.
UPDATE "programs"
SET "institution_id" = 'huji',
    "institution_name" = 'האוניברסיטה העברית בירושלים',
    "updated_at" = now()
WHERE "id" = 'nutrition';
--> statement-breakpoint
DELETE FROM "admission_thresholds"
WHERE "program_id" = 'nutrition' AND "institution_id" IN ('tau', 'bgu');
--> statement-breakpoint
DELETE FROM "admission_requirements"
WHERE "program_id" = 'nutrition' AND "institution_id" IN ('tau', 'bgu');
--> statement-breakpoint
DELETE FROM "program_institutions"
WHERE "program_id" = 'nutrition' AND "institution_id" IN ('tau', 'bgu');
--> statement-breakpoint
-- Restore only the supported links from the canonical Nutrition seed.
-- Existing reviewed requirements and unrelated programmes are left intact.
INSERT INTO "program_institutions" ("program_id", "institution_id")
SELECT program."id", institution."id"
FROM "programs" AS program
CROSS JOIN "institutions" AS institution
WHERE program."id" = 'nutrition' AND institution."id" IN ('huji', 'ariel')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "admission_requirements" ("id", "program_id", "institution_id")
SELECT 'nutrition:' || link."institution_id", link."program_id", link."institution_id"
FROM "program_institutions" AS link
WHERE link."program_id" = 'nutrition' AND link."institution_id" IN ('huji', 'ariel')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Preserve the existing legacy seed cutoffs. HUJI exact evaluation uses the
-- separately verified official track 712-1212 and its 19.75 adapted-score cutoff.
INSERT INTO "admission_thresholds"
    ("id", "program_id", "institution_id", "university_id", "threshold_kind", "threshold_value")
SELECT 'nutrition:' || link."institution_id" || ':' || link."institution_id" || ':sekhem',
       link."program_id", link."institution_id", link."institution_id", 'sekhem',
       CASE link."institution_id" WHEN 'huji' THEN 635 ELSE 620 END
FROM "program_institutions" AS link
WHERE link."program_id" = 'nutrition' AND link."institution_id" IN ('huji', 'ariel')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "source_urls"
    ("id", "admission_requirement_id", "institution_id", "program_id", "kind", "url")
SELECT requirement."id" || ':institution', requirement."id", institution."id", 'nutrition',
       'institution', COALESCE(institution."program_url", 'https://' || institution."domain")
FROM "admission_requirements" AS requirement
JOIN "institutions" AS institution ON institution."id" = requirement."institution_id"
WHERE requirement."program_id" = 'nutrition'
  AND requirement."institution_id" IN ('huji', 'ariel')
  AND COALESCE(institution."program_url", institution."domain") IS NOT NULL
ON CONFLICT DO NOTHING;
