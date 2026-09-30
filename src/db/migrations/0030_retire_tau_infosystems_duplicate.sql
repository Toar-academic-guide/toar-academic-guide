-- TAU's official undergraduate programme is Management (122111050000),
-- already represented by tau_business. Retire only the unsupported extra row.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "programs" WHERE "id" = 'tau_infosystems') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "programs" WHERE "id" = 'tau_business') THEN
    RAISE EXCEPTION 'Cannot retire tau_infosystems without the existing TAU Management programme';
  END IF;

  -- Keep saved selections, including any created since the catalogue audit.
  -- Block concurrent saves until the transfer and retirement finish together.
  LOCK TABLE "saved_programs" IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO "saved_programs" ("user_id", "program_id", "created_at")
  SELECT "user_id", 'tau_business', "created_at"
  FROM "saved_programs"
  WHERE "program_id" = 'tau_infosystems'
  ON CONFLICT ("user_id", "program_id") DO NOTHING;

  -- Catalogue children cascade; unexpected operational references fail safely.
  DELETE FROM "programs" WHERE "id" = 'tau_infosystems';
END $$;
