-- Split patient name into first/last so the UI can show "first + last initial"
-- while the full name stays hidden until re-authentication.
ALTER TABLE "Patient" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Patient" ADD COLUMN "lastName" TEXT;

-- Backfill from the existing fullName: first token -> firstName, the rest -> lastName.
UPDATE "Patient"
SET "firstName" = CASE
      WHEN position(' ' in btrim("fullName")) > 0
        THEN split_part(btrim("fullName"), ' ', 1)
      ELSE btrim("fullName")
    END,
    "lastName" = CASE
      WHEN position(' ' in btrim("fullName")) > 0
        THEN btrim(substring(btrim("fullName") from position(' ' in btrim("fullName")) + 1))
      ELSE ''
    END;

UPDATE "Patient" SET "firstName" = btrim("fullName")
  WHERE "firstName" IS NULL OR btrim("firstName") = '';
UPDATE "Patient" SET "lastName" = '' WHERE "lastName" IS NULL;

ALTER TABLE "Patient" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "lastName" SET NOT NULL;
