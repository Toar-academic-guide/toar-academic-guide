-- The retired importer defaulted unmatched institutions to computer science.
-- Danon offers culinary training: https://www.danon.org.il/ (checked 2026-10-21).
-- Keep the legacy ID so saved programmes, evidence and shared URLs survive.
UPDATE "programs"
SET "name" = 'קולינריה - דנון - קולינריה',
    "category" = 'קולינריה',
    "updated_at" = now()
WHERE "id" = 'danon_cs'
  AND "institution_id" = 'danon'
  AND "name" = 'מדעי המחשב - דנון - קולינריה'
  AND "category" = 'מדעי המחשב';
