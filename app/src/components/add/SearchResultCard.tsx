
import { StatusBadge } from '@/components/ui/status-badge-compat';

export interface SearchResultCardProps {
  title: string;
  year?: number;
  overview?: string;
  network?: string;
  status?: string;
  posterUrl?: string;
  tmdbId?: number;
  tvdbId?: number;
  mediaType: 'MOVIE' | 'TV';
  isSelected: boolean;
  alreadyAdded: boolean;
  onSelect: () => void;
}

function getStatusBadge(status: string | undefined): 'continuing' | 'ended' | 'upcoming' | 'unknown' {
  if (!status) return 'unknown';
  const normalized = status.toLowerCase();
  if (normalized.includes('continu') || normalized.includes('return')) return 'continuing';
  if (normalized.includes('end') || normalized.includes('cancel')) return 'ended';
  if (normalized.includes('upcom') || normalized.includes('announc')) return 'upcoming';
  return 'unknown';
}

export function SearchResultCard({
  title,
  year,
  overview,
  network,
  status,
  posterUrl,
  isSelected,
  alreadyAdded,
  onSelect,
}: SearchResultCardProps) {
  const displayPoster = posterUrl ?? '/images/placeholder-poster.png';
  const truncatedOverview = overview && overview.length > 150 ? `${overview.slice(0, 150)}...` : overview;

  return (
    <article
      className={`flex gap-3 rounded-lg border p-3 transition-all ${
        isSelected
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border-subtle bg-surface-1 hover:border-border-default'
      }`}
    >
      {/* Poster Thumbnail */}
      <div className="h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-md bg-surface-2">
        <img
          src={displayPoster}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={event => {
            const target = event.currentTarget;
            target.src = '/images/placeholder-poster.png';
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary line-clamp-1">{title}</h3>
          {alreadyAdded && <StatusBadge status="monitored" />}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          {year && <span className="font-medium">{year}</span>}
          {network && (
            <>
              <span className="text-border-subtle">•</span>
              <span>{network}</span>
            </>
          )}
          {status && (
            <>
              <span className="text-border-subtle">•</span>
              <StatusBadge status={getStatusBadge(status)} />
            </>
          )}
        </div>

        <p className="mt-1 line-clamp-2 flex-1 text-sm text-text-secondary">
          {truncatedOverview ?? 'No overview available.'}
        </p>

        <button
          type="button"
          onClick={onSelect}
          className="mt-2 self-start rounded-sm border border-border-subtle px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface-2"
        >
          {alreadyAdded ? 'Review Config' : 'Select'}
        </button>
      </div>
    </article>
  );
}
