-- Adds canonical category taxonomy columns to Artist and Event.
-- Run in Supabase Dashboard → SQL Editor (idempotent).

-- ── Artist ─────────────────────────────────────────────────────────────
ALTER TABLE "Artist"
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'music';

ALTER TABLE "Artist"
  ADD COLUMN IF NOT EXISTS "subCategory" TEXT;

-- Best-effort backfill from existing free-text fields for older rows.
UPDATE "Artist"
SET "category" = CASE
  WHEN LOWER(COALESCE("profession", '')) ~ '(dance|dancer|nritya|kathak|bharata|kandyan|kolam)' THEN 'dance'
  WHEN LOWER(COALESCE("profession", '')) ~ '(act|actor|actress|director|film|cinema|cinemato)' THEN 'film'
  WHEN LOWER(COALESCE("profession", '')) ~ '(drama|theatre|theater|stage|playwright)' THEN 'drama'
  WHEN LOWER(COALESCE("genre", '')) ~ '(dance)' THEN 'dance'
  WHEN LOWER(COALESCE("genre", '')) ~ '(film|cinema)' THEN 'film'
  WHEN LOWER(COALESCE("genre", '')) ~ '(drama|theatre|theater)' THEN 'drama'
  ELSE 'music'
END
WHERE "category" = 'music';

CREATE INDEX IF NOT EXISTS "Artist_category_idx" ON "Artist" ("category");
CREATE INDEX IF NOT EXISTS "Artist_subCategory_idx" ON "Artist" ("subCategory");

-- ── Event ──────────────────────────────────────────────────────────────
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "subCategory" TEXT;

CREATE INDEX IF NOT EXISTS "Event_subCategory_idx" ON "Event" ("subCategory");

