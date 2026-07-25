DELETE FROM "admission_thresholds" AS threshold
USING "institutions" AS institution
WHERE threshold."institution_id" = institution."id"
  AND threshold."university_id" <> COALESCE(institution."university_id", institution."id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "enforce_admission_threshold_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "program_institutions" AS program_institution
    INNER JOIN "institutions" AS institution
      ON institution."id" = program_institution."institution_id"
    WHERE program_institution."program_id" = NEW."program_id"
      AND program_institution."institution_id" = NEW."institution_id"
      AND COALESCE(institution."university_id", institution."id") = NEW."university_id"
  ) THEN
    RAISE EXCEPTION
      'admission threshold must reference a linked institution and its owning university';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "admission_threshold_scope_invariant"
BEFORE INSERT OR UPDATE OF "program_id", "institution_id", "university_id"
ON "admission_thresholds"
FOR EACH ROW
EXECUTE FUNCTION "enforce_admission_threshold_scope"();
