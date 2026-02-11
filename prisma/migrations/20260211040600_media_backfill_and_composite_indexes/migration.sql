-- Backfill shared Media rows for existing TV records.
INSERT INTO "Media" (
  "mediaType",
  "tmdbId",
  "tvdbId",
  "imdbId",
  "title",
  "cleanTitle",
  "sortTitle",
  "status",
  "overview",
  "monitored",
  "qualityProfileId",
  "path",
  "year",
  "added",
  "network"
)
SELECT
  'TV',
  s."tmdbId",
  s."tvdbId",
  s."imdbId",
  s."title",
  s."cleanTitle",
  s."sortTitle",
  s."status",
  s."overview",
  s."monitored",
  s."qualityProfileId",
  s."path",
  s."year",
  s."added",
  s."network"
FROM "Series" s
WHERE s."mediaId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Media" m
    WHERE m."mediaType" = 'TV'
      AND m."tvdbId" = s."tvdbId"
  );

-- Backfill shared Media rows for existing Movie records.
INSERT INTO "Media" (
  "mediaType",
  "tmdbId",
  "imdbId",
  "title",
  "cleanTitle",
  "sortTitle",
  "status",
  "overview",
  "monitored",
  "qualityProfileId",
  "path",
  "year",
  "added",
  "minimumAvailability",
  "inCinemas",
  "digitalRelease",
  "physicalRelease"
)
SELECT
  'MOVIE',
  m."tmdbId",
  m."imdbId",
  m."title",
  m."cleanTitle",
  m."sortTitle",
  m."status",
  m."overview",
  m."monitored",
  m."qualityProfileId",
  m."path",
  m."year",
  m."added",
  m."minimumAvailability",
  m."inCinemas",
  m."digitalRelease",
  m."physicalRelease"
FROM "Movie" m
WHERE m."mediaId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Media" shared
    WHERE shared."mediaType" = 'MOVIE'
      AND shared."tmdbId" = m."tmdbId"
  );

-- Link type-specific rows to shared Media rows.
UPDATE "Series"
SET "mediaId" = (
  SELECT m."id"
  FROM "Media" m
  WHERE m."mediaType" = 'TV'
    AND m."tvdbId" = "Series"."tvdbId"
)
WHERE "mediaId" IS NULL;

UPDATE "Movie"
SET "mediaId" = (
  SELECT m."id"
  FROM "Media" m
  WHERE m."mediaType" = 'MOVIE'
    AND m."tmdbId" = "Movie"."tmdbId"
)
WHERE "mediaId" IS NULL;

-- Replace global TMDB/TVDB uniqueness with type-aware uniqueness.
DROP INDEX IF EXISTS "Media_tmdbId_key";
DROP INDEX IF EXISTS "Media_tvdbId_key";
CREATE UNIQUE INDEX "Media_mediaType_tmdbId_key" ON "Media"("mediaType", "tmdbId");
CREATE UNIQUE INDEX "Media_mediaType_tvdbId_key" ON "Media"("mediaType", "tvdbId");
