# Extraction candidate query filtered in SQL (2026-11-09)

The extraction pass previously loaded **every** embedded track (4,000+ rows; mostly non-Chinese and bitmap)
and stat-ed them all before finding ten candidates.

- Query now filters in SQL: `filePath IS NULL/'' AND languageCode IN (chi,zho,zh,cmn) AND codec IN
  (subrip,ass,mov_text,webvtt,text,srt)`; the service still re-checks defensively.
- First run after the change: `extracted 10, skipped **57**, failed 0` (was **4,150** skipped).
- Queue: 99 extracted / 34 attempt-capped (29 capped counted separately) / 218 actionable remaining.
