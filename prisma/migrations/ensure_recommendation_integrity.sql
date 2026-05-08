UPDATE "Recommendation"
SET reason = ''
WHERE reason IS NULL;

DELETE FROM "Recommendation" r
WHERE r."recommendedType" = 'ARTIST'
  AND NOT EXISTS (
    SELECT 1 FROM "Artist" a WHERE a.id = r."recommendedId"
  );

DELETE FROM "Recommendation" r
WHERE r."recommendedType" = 'EVENT'
  AND NOT EXISTS (
    SELECT 1 FROM "Event" e WHERE e.id = r."recommendedId"
  );

ALTER TABLE "Recommendation"
ALTER COLUMN reason SET DEFAULT '',
ALTER COLUMN reason SET NOT NULL;