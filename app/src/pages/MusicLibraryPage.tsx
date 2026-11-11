import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/ui/button';
import {
  albumArtworkUrl,
  musicManageApi,
  trackStreamUrl,
  type MusicAlbum,
  type MusicAlbumDetail,
  type MusicArtist,
  type MusicIngestResult,
  type MusicListeningProfile,
  type MusicReceipt,
  type MusicReceipts,
  type MusicScanSummary,
  type MusicTrackSearch,
} from '@/lib/api/musicManageApi';

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : at.toLocaleString();
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** One honest summary line for a scan; unreadable files are named, never swallowed. */
function scanSummaryText(prefix: string, summary: MusicScanSummary): string {
  const unreadable = summary.unreadable.length;
  return [
    `${prefix}: ${plural(summary.scanned, 'file')} scanned`,
    plural(summary.tracks, 'track'),
    plural(summary.artists, 'artist'),
    plural(summary.albums, 'album'),
    unreadable === 0 ? 'nothing unreadable' : `${plural(unreadable, 'unreadable file')}`,
  ].join(' · ');
}

function statusClass(status: string): string {
  switch (status) {
    case 'FILED':
      return 'bg-accent-success/15 text-accent-success';
    case 'REVIEW':
      return 'bg-accent-warning/15 text-accent-warning';
    case 'FAILED':
      return 'bg-accent-danger/15 text-accent-danger';
    default:
      return 'bg-white/10 text-text-muted';
  }
}

function monogram(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

/**
 * Music library section (track feature_spa_management_surfaces_20261111, Phase 3).
 *
 * The SPA had no Music surface at all — the server's `/api/music/*` domain was reachable only from
 * curl or the TV client. This page browses artists → albums → tracks, streams a track inline
 * through the library's own Range-capable route, and surfaces the management the server already
 * exposes: scan (dry-run preview, then apply), YouTube ingest (with the beets REVIEW reason) and the
 * listening profile that drives discovery.
 *
 * Server gaps, reported rather than papered over as dead buttons (FR-6):
 * - no `DELETE /api/music/tracks/:id`, so there is no track delete;
 * - `POST /api/music/tag` only accepts a path inside the staging folder, so it cannot retag an
 *   existing library track — there is no retag action.
 */
export function MusicLibraryPage() {
  const api = musicManageApi;

  const [artists, setArtists] = useState<MusicArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedArtist, setSelectedArtist] = useState<MusicArtist | null>(null);
  const [albums, setAlbums] = useState<MusicAlbum[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [album, setAlbum] = useState<MusicAlbumDetail | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrackSearch | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [previewTrackId, setPreviewTrackId] = useState<number | null>(null);

  const [profile, setProfile] = useState<MusicListeningProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<MusicReceipts | null>(null);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const [scanPreview, setScanPreview] = useState<MusicScanSummary | null>(null);
  const [scanApplied, setScanApplied] = useState<MusicScanSummary | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [ingestUrl, setIngestUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<MusicIngestResult | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const ingestInputRef = useRef<HTMLInputElement>(null);

  const refreshArtists = useCallback(async () => {
    try {
      setArtists(await api.listArtists());
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Failed to load the music library'));
    }
  }, [api]);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await api.getListeningProfile());
      setProfileError(null);
    } catch (err) {
      setProfile(null);
      setProfileError(errorText(err, 'Listening history is unavailable'));
    }
  }, [api]);

  const refreshReceipts = useCallback(async () => {
    try {
      setReceipts(await api.getReceipts(20));
      setReceiptsError(null);
    } catch (err) {
      setReceiptsError(errorText(err, 'Failed to load ingest receipts'));
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await api.listArtists();
        if (!cancelled) {
          setArtists(rows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorText(err, 'Failed to load the music library'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [api]);

  // Independent loads: a thin/unavailable listening profile or receipt log must never blank the
  // library itself. Each failure is reported in its own card.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await api.getListeningProfile();
        if (!cancelled) {
          setProfile(value);
          setProfileError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setProfileError(errorText(err, 'Listening history is unavailable'));
        }
      }
    })();
    void (async () => {
      try {
        const value = await api.getReceipts(20);
        if (!cancelled) {
          setReceipts(value);
          setReceiptsError(null);
        }
      } catch (err) {
        if (!cancelled) setReceiptsError(errorText(err, 'Failed to load ingest receipts'));
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const openArtist = useCallback(async (artist: MusicArtist) => {
    setSelectedArtist(artist);
    setAlbum(null);
    setAlbums([]);
    setAlbumsLoading(true);
    try {
      setAlbums(await api.listAlbums(artist.id));
    } catch (err) {
      setError(errorText(err, `Failed to load albums for ${artist.name}`));
    } finally {
      setAlbumsLoading(false);
    }
  }, [api]);

  const openAlbum = useCallback(async (next: MusicAlbum) => {
    setAlbumLoading(true);
    setPreviewTrackId(null);
    try {
      setAlbum(await api.getAlbum(next.id));
    } catch (err) {
      setError(errorText(err, `Failed to load ${next.title}`));
    } finally {
      setAlbumLoading(false);
    }
  }, [api]);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    setSearchTerm(trimmed);
    if (trimmed.length === 0) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      setSearchResults(await api.searchTracks({ q: trimmed, limit: 50 }));
    } catch (err) {
      setSearchResults(null);
      setSearchError(errorText(err, 'Search failed'));
    } finally {
      setSearching(false);
    }
  }, [api]);

  const runScan = async (dryRun: boolean) => {
    setScanning(true);
    setScanError(null);
    if (dryRun) {
      setScanPreview(null);
      setScanApplied(null);
    }
    try {
      const summary = await api.scan(dryRun);
      if (dryRun) {
        setScanPreview(summary);
      } else {
        setScanApplied(summary);
        setScanPreview(null);
        await refreshArtists();
        await refreshProfile();
      }
    } catch (err) {
      setScanError(errorText(err, dryRun ? 'Scan preview failed' : 'Scan failed'));
    } finally {
      setScanning(false);
    }
  };

  const runIngest = async () => {
    const url = ingestUrl.trim();
    if (url.length === 0) {
      setIngestError('Paste a YouTube URL first.');
      ingestInputRef.current?.focus();
      return;
    }
    setIngesting(true);
    setIngestResult(null);
    setIngestError(null);
    try {
      const result = await api.ingest(url);
      setIngestResult(result);
      if (result.ok) {
        setIngestUrl('');
        await refreshReceipts();
        await refreshArtists();
        await refreshProfile();
      }
    } catch (err) {
      setIngestError(errorText(err, 'Ingest failed'));
    } finally {
      setIngesting(false);
    }
  };

  const topArtists = useMemo(() => {
    if (!profile) return [];
    return [...profile.artists].sort((a, b) => b.plays - a.plays || b.tracks - a.tracks).slice(0, 5);
  }, [profile]);

  const showingSearch = searchTerm.length > 0;

  const renderTrackList = (
    rows: Array<{ id: number; title: string; artist?: string; album?: string; durationSeconds?: number | null; playCount?: number }>,
    emptyLabel: string,
  ) => {
    if (rows.length === 0) {
      return <p className="text-sm text-text-muted">{emptyLabel}</p>;
    }
    return (
      <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-surface-1">
        {rows.map((track) => (
          <li key={track.id} className="space-y-2 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{track.title}</p>
                <p className="truncate text-xs text-text-muted">
                  {[track.artist, track.album, formatDuration(track.durationSeconds)]
                    .filter((part) => part != null && part !== '')
                    .join(' · ') || 'No metadata'}
                  {track.playCount != null && track.playCount > 0
                    ? ` · ${plural(track.playCount, 'play')}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Preview ${track.title}`}
                aria-pressed={previewTrackId === track.id}
                onClick={() => setPreviewTrackId((current) => (current === track.id ? null : track.id))}
                className="rounded-md border border-border px-3 py-1 text-xs hover:border-accent-primary"
              >
                {previewTrackId === track.id ? 'Stop preview' : 'Preview'}
              </button>
            </div>
            {previewTrackId === track.id ? (
              <audio
                controls
                autoPlay
                preload="none"
                className="w-full"
                aria-label={`Audio preview of ${track.title}`}
                src={trackStreamUrl(track.id)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <RouteScaffold
      title="Music"
      description="Artists, albums and tracks from the library — scan it, ingest from YouTube, and see what you actually listen to."
    >
      <div className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-md border border-accent-danger/40 bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger">
            {error}
          </p>
        ) : null}

        {/* Listening profile — drives the weekly discovery run. */}
        <section className="rounded-md border border-border-subtle bg-surface-1 p-4" aria-label="Listening summary">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Listening summary</h2>
            {profile ? (
              <span className="text-xs text-text-muted">
                {plural(profile.library.trackCount, 'track')} · {plural(profile.library.artistNames.length, 'artist')} ·{' '}
                {plural(profile.dataQuality.playsObserved, 'play')} observed
              </span>
            ) : null}
          </div>
          {profileError ? (
            <p role="status" className="mt-2 text-xs text-text-muted">
              {profileError} — the library is still available below.
            </p>
          ) : null}
          {profile ? (
            <>
              {topArtists.length === 0 ? (
                <p className="mt-2 text-xs text-text-muted">No artists in the library yet.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {topArtists.map((artist) => (
                    <li
                      key={artist.name}
                      className="rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary"
                    >
                      <span className="text-text-primary">{artist.name}</span>
                      {' · '}
                      {plural(artist.plays, 'play')}
                      {' · '}
                      {plural(artist.tracks, 'track')}
                    </li>
                  ))}
                </ul>
              )}
              {profile.dataQuality.insufficientHistory ? (
                <p role="status" className="mt-3 rounded border border-accent-warning/40 bg-accent-warning/10 px-2 py-1.5 text-xs text-accent-warning">
                  Thin listening history: only {plural(profile.dataQuality.playsObserved, 'play')} observed. Weekly
                  discovery will lean on browser history until more is recorded.
                </p>
              ) : null}
            </>
          ) : null}
        </section>

        {/* Management: scan + ingest. Both call routes known to exist; no retag/delete (server gaps). */}
        <section className="grid gap-4 md:grid-cols-2" aria-label="Music management">
          <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-sm font-semibold text-text-primary">Scan library</h2>
            <p className="mt-1 text-xs text-text-muted">
              Reads tags with ffprobe and upserts by file path. The preview never writes.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={scanning}
                onClick={() => void runScan(true)}
              >
                {scanning && scanPreview === null && scanApplied === null ? 'Scanning…' : 'Scan library'}
              </Button>
              {scanPreview ? (
                <Button size="xs" variant="primary" disabled={scanning} onClick={() => void runScan(false)}>
                  {scanning ? 'Applying…' : 'Apply scan'}
                </Button>
              ) : null}
            </div>
            {scanPreview ? (
              <p role="status" className="mt-2 text-xs text-text-secondary">
                {scanSummaryText('Dry run (nothing written)', scanPreview)}
              </p>
            ) : null}
            {scanApplied ? (
              <p role="status" className="mt-2 text-xs text-accent-success">
                {scanSummaryText('Scan applied', scanApplied)}
              </p>
            ) : null}
            {scanError ? (
              <p role="alert" className="mt-2 text-xs text-accent-danger">
                {scanError}
              </p>
            ) : null}
            {scanPreview && scanPreview.unreadable.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-accent-warning">
                {scanPreview.unreadable.map((row) => (
                  <li key={row.path} className="break-all">
                    {row.path}: {row.error}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-md border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-sm font-semibold text-text-primary">Ingest from URL</h2>
            <p className="mt-1 text-xs text-text-muted">
              Downloads one YouTube video as m4a, then tags and files it with beets. Takes about a minute.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={ingestInputRef}
                type="url"
                value={ingestUrl}
                onChange={(event) => setIngestUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (!ingesting) void runIngest();
                  }
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                aria-label="YouTube URL to ingest"
                className="min-w-0 flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-sm"
              />
              <Button size="xs" variant="outline" disabled={ingesting} onClick={() => void runIngest()}>
                {ingesting ? 'Ingesting…' : 'Ingest'}
              </Button>
            </div>
            {ingesting ? (
              <p role="status" className="mt-2 text-xs text-text-secondary">
                Ingesting… this usually takes about a minute. Do not close the page.
              </p>
            ) : null}
            {ingestResult ? (
              <div className="mt-2 space-y-1 text-xs">
                {ingestResult.skipped ? (
                  <p role="status" className="text-accent-warning">
                    Already ingested ({ingestResult.skipped}) — nothing new was added.
                  </p>
                ) : ingestResult.ok && ingestResult.tag?.filed ? (
                  <p role="status" className="text-accent-success">
                    Filed: <span className="break-all font-mono">{ingestResult.tag.finalPath ?? ingestResult.audioPath}</span>
                  </p>
                ) : ingestResult.ok ? (
                  <p role="status" className="text-accent-warning">
                    Needs review: {ingestResult.tag?.reason ?? 'beets could not place this album'}.
                    {ingestResult.tag?.finalPath ?? ingestResult.audioPath ? (
                      <span className="mt-0.5 block break-all font-mono text-text-muted">
                        {ingestResult.tag?.finalPath ?? ingestResult.audioPath}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p role="alert" className="break-all text-accent-danger">
                    Ingest failed: {ingestResult.error ?? 'unknown error'}
                  </p>
                )}
              </div>
            ) : null}
            {ingestError ? (
              <p role="alert" className="mt-2 text-xs text-accent-danger">
                {ingestError}
              </p>
            ) : null}
          </div>
        </section>

        {/* Browse: artists → albums → tracks, with search replacing the browser. */}
        <section className="space-y-3" aria-label="Music library">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch(query);
            }}
          >
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.trim().length === 0) void runSearch('');
              }}
              placeholder="Search tracks, artists or albums"
              aria-label="Search music"
              className="w-full max-w-md rounded-md border border-border bg-surface-1 px-3 py-2 text-sm"
            />
            <Button size="xs" variant="outline" type="submit" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
            {searchTerm ? (
              <Button
                size="xs"
                variant="ghost"
                type="button"
                onClick={() => { setQuery(''); void runSearch(''); }}
              >
                Clear
              </Button>
            ) : null}
            <span className="text-xs text-text-muted">
              {searching
                ? 'Searching…'
                : searchResults
                  ? `${plural(searchResults.total, 'matching track')}`
                  : isLoading
                    ? 'Loading…'
                    : `${plural(artists.length, 'artist')}`}
            </span>
          </form>

          {searchError ? (
            <p role="alert" className="text-sm text-accent-danger">{searchError}</p>
          ) : null}

          {showingSearch ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-text-primary">
                Search results for “{searchTerm}”
              </h2>
              {searchResults
                ? renderTrackList(
                    searchResults.items.map((track) => ({
                      id: track.id,
                      title: track.title,
                      artist: track.artistName,
                      album: track.albumTitle,
                      durationSeconds: track.durationSeconds,
                      playCount: track.playCount,
                    })),
                    'No tracks matched that search.',
                  )
                : searching
                  ? <p className="text-sm text-text-muted">Searching…</p>
                  : null}
            </div>
          ) : album ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <button type="button" className="underline" onClick={() => { setAlbum(null); setPreviewTrackId(null); }}>
                  ← Back to albums
                </button>
                <span>·</span>
                <button type="button" className="underline" onClick={() => { setAlbum(null); setSelectedArtist(null); setAlbums([]); }}>
                  All artists
                </button>
              </div>
              <div className="flex items-center gap-3">
                <AlbumArtwork albumId={album.id} title={album.title} size="lg" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{album.title}</h2>
                  <p className="text-xs text-text-muted">
                    {[
                      selectedArtist?.name,
                      album.year ?? undefined,
                      plural(album.tracks.length, 'track'),
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {renderTrackList(
                album.tracks.map((track) => ({
                  id: track.id,
                  title: track.title,
                  artist: selectedArtist?.name,
                  album: album.title,
                  durationSeconds: track.durationSeconds,
                  playCount: track.playCount,
                })),
                'This album has no tracks.',
              )}
            </div>
          ) : selectedArtist ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <button type="button" className="underline" onClick={() => { setSelectedArtist(null); setAlbums([]); }}>
                  ← All artists
                </button>
                <span>·</span>
                <h2 className="text-sm font-semibold text-text-primary">{selectedArtist.name}</h2>
              </div>
              {albumsLoading ? (
                <p className="text-sm text-text-muted">Loading albums…</p>
              ) : albums.length === 0 ? (
                <p className="text-sm text-text-muted">No albums for this artist.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {albums.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => void openAlbum(row)}
                      aria-label={`Open album ${row.title}`}
                      className="flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-1 text-left hover:border-accent-primary"
                    >
                      <AlbumArtwork albumId={row.id} title={row.title} size="sm" />
                      <span className="px-2 pt-2 text-sm font-medium text-text-primary">{row.title}</span>
                      <span className="px-2 pb-2 text-xs text-text-muted">
                        {row.year ? `${row.year} · ` : ''}
                        {plural(row.trackCount ?? 0, 'track')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {albumLoading ? <p className="text-sm text-text-muted">Loading album…</p> : null}
            </div>
          ) : isLoading ? (
            <p className="text-sm text-text-muted">Loading the music library…</p>
          ) : artists.length === 0 ? (
            <p className="rounded-md border border-border-subtle bg-surface-1 px-3 py-4 text-sm text-text-muted">
              No artists yet. Run “Scan library” above to index the music folder.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {artists.map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => void openArtist(artist)}
                  aria-label={`Open artist ${artist.name}`}
                  className="flex flex-col items-start gap-1 rounded-md border border-border-subtle bg-surface-1 p-3 text-left hover:border-accent-primary"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
                    {monogram(artist.name)}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm font-medium text-text-primary">{artist.name}</span>
                  <span className="text-xs text-text-muted">
                    {plural(artist.albumCount, 'album')} · {plural(artist.trackCount, 'track')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Receipts: why an ingest did not appear, with the reason exactly as the server wrote it. */}
        <section className="space-y-2" aria-label="Ingest receipts">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Recent ingest receipts</h2>
            {receipts ? (
              <span className="text-xs text-text-muted">
                {plural(receipts.summary.attempted, 'attempt')} · {receipts.summary.filed} filed ·{' '}
                {receipts.summary.review} review · {receipts.summary.failed} failed
              </span>
            ) : null}
          </div>
          {receiptsError ? (
            <p role="status" className="text-xs text-text-muted">
              {receiptsError} — the library above is unaffected.
            </p>
          ) : null}
          {receipts && receipts.receipts.length === 0 ? (
            <p className="text-sm text-text-muted">No ingest receipts yet.</p>
          ) : receipts ? (
            <div className="overflow-x-auto rounded-md border border-border-subtle bg-surface-1">
              <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th scope="col" className="px-3 py-2 font-medium">When</th>
                    <th scope="col" className="px-3 py-2 font-medium">Video</th>
                    <th scope="col" className="px-3 py-2 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2 font-medium">Reason</th>
                    <th scope="col" className="px-3 py-2 font-medium">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.receipts.map((receipt: MusicReceipt) => (
                    <tr key={`${receipt.at}-${receipt.videoId}`} className="border-b border-border-subtle/60 align-top last:border-b-0">
                      <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{formatWhen(receipt.at)}</td>
                      <td className="px-3 py-2 font-mono text-text-secondary">{receipt.videoId}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] ${statusClass(receipt.status)}`}>
                          {receipt.status}
                        </span>
                      </td>
                      <td className="max-w-md whitespace-pre-wrap break-words px-3 py-2 text-text-secondary">
                        {receipt.reason ?? '—'}
                      </td>
                      <td className="max-w-xs break-all px-3 py-2 font-mono text-text-muted">
                        {receipt.path ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </RouteScaffold>
  );
}

function AlbumArtwork({ albumId, title, size }: { albumId: number; title: string; size: 'sm' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const box = size === 'lg' ? 'h-16 w-16' : 'h-28 w-full';
  if (failed) {
    return (
      <span className={`flex ${box} items-center justify-center bg-black/40 text-lg font-bold text-white/60`}>
        {monogram(title)}
      </span>
    );
  }
  return (
    <img
      src={albumArtworkUrl(albumId)}
      alt={`${title} artwork`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${box} object-cover`}
    />
  );
}
