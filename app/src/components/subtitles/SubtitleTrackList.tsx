'use client';

import type { SubtitleTrack } from '@/lib/api/subtitleApi';
import { LanguageBadge } from './LanguageBadge';
import { Button } from '@/components/primitives/Button';
import { Download, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

export interface SubtitleTrackListProps {
  tracks: SubtitleTrack[];
  missingLanguages: string[];
  onSearch: (languageCode: string) => void;
  onDelete: (trackId: number) => void;
  onDownload?: (track: SubtitleTrack) => void;
  className?: string;
}

interface TrackDisplay extends SubtitleTrack {
  id: number;
}

export function SubtitleTrackList({
  tracks,
  missingLanguages,
  onSearch,
  onDelete,
  onDownload,
  className = '',
}: SubtitleTrackListProps) {
  const [searchingLang, setSearchingLang] = useState<string | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<number | null>(null);

  const tracksWithIds: TrackDisplay[] = tracks.map((track, index) => ({
    ...track,
    id: index,
  }));

  const handleSearch = (langCode: string) => {
    setSearchingLang(langCode);
    onSearch(langCode);
  };

  const handleDelete = async (trackId: number) => {
    setDeletingTrack(trackId);
    try {
      onDelete(trackId);
    } finally {
      setDeletingTrack(null);
    }
  };

  const truncatePath = (path: string, maxLength = 50) => {
    if (path.length <= maxLength) return path;
    return `${path.slice(0, maxLength / 2)}...${path.slice(-maxLength / 2)}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Available Subtitles */}
      {tracksWithIds.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Available Subtitles</h3>
          <div className="space-y-2">
            {tracksWithIds.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-1 px-3 py-2"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <LanguageBadge
                    languageCode={track.languageCode}
                    variant="available"
                    isForced={track.isForced}
                    isHi={track.isHi}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium text-text-secondary">
                      {track.provider}
                    </span>
                    <span
                      className="text-xs text-text-muted font-mono truncate"
                      title={track.path}
                    >
                      {truncatePath(track.path)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onDownload && (
                    <Button
                      variant="secondary"
                      onClick={() => onDownload(track)}
                      aria-label={`Download subtitle for ${track.languageCode}`}
                      className="p-1.5"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => handleDelete(track.id)}
                    disabled={deletingTrack === track.id}
                    aria-label={`Delete subtitle for ${track.languageCode}`}
                    className="p-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Languages */}
      {missingLanguages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Missing Languages</h3>
            <Button
              variant="secondary"
              onClick={() => missingLanguages.forEach((lang) => handleSearch(lang))}
              disabled={searchingLang !== null}
            >
              <Search className="h-4 w-4 mr-1" />
              Search All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingLanguages.map((langCode) => (
              <LanguageBadge
                key={langCode}
                languageCode={langCode}
                variant="searching"
                onClick={() => handleSearch(langCode)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tracksWithIds.length === 0 && missingLanguages.length === 0 && (
        <div className="rounded-md border border-border-subtle bg-surface-2 px-4 py-8 text-center">
          <p className="text-sm text-text-muted">No subtitle tracks found</p>
        </div>
      )}
    </div>
  );
}
