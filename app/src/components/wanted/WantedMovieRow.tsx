
import { type LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge-compat';
import type { MissingMovie } from '@/types/wanted';

export interface WantedMovieRowProps {
  movie: MissingMovie;
  onSearch: (movie: MissingMovie) => void;
  onEdit: (movie: MissingMovie) => void;
  onDelete: (movie: MissingMovie) => void;
  onToggleMonitored: (movieId: number, monitored: boolean) => void;
  selected?: boolean;
  onSelect: (movieId: number) => void;
}

export function getStatusBadgeColor(status: MissingMovie['status']): string {
  switch (status) {
    case 'announced':
      return 'text-accent-info';
    case 'incinemas':
      return 'text-accent-warning';
    case 'released':
      return 'text-accent-success';
    case 'missing':
    default:
      return 'text-accent-danger';
  }
}

export function getStatusLabel(status: MissingMovie['status']): string {
  switch (status) {
    case 'announced':
      return 'Announced';
    case 'incinemas':
      return 'In Cinemas';
    case 'released':
      return 'Released';
    case 'missing':
    default:
      return 'Missing';
  }
}

export function WantedMovieRow({
  movie,
  onSearch,
  onEdit,
  onDelete,
  onToggleMonitored,
  selected,
  onSelect,
}: WantedMovieRowProps) {
  return (
    <tr className="border-b border-border-subtle hover:bg-surface-2">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(movie.id)}
          className="rounded-sm border-border-subtle bg-surface-1"
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          {movie.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="h-12 w-8 rounded-sm object-cover"
            />
          )}
          <div>
            <div className="font-medium">{movie.title}</div>
            <div className="text-sm text-text-secondary">{movie.year}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={movie.status === 'missing' ? 'wanted' : 'monitored'} />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1 text-sm">
          <div>
            <span className="text-text-secondary">Cinema:</span>{' '}
            <span className="text-text-primary">{movie.cinemaDate || '-'}</span>
          </div>
          <div>
            <span className="text-text-secondary">Digital:</span>{' '}
            <span className="text-text-primary">{movie.digitalRelease || '-'}</span>
          </div>
          <div>
            <span className="text-text-secondary">Physical:</span>{' '}
            <span className="text-text-primary">{movie.physicalRelease || '-'}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="text-sm">{movie.qualityProfileName || '-'}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-sm">{movie.runtime ? `${movie.runtime} min` : '-'}</span>
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onToggleMonitored(movie.movieId, !movie.monitored)}
          className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
            movie.monitored
              ? 'bg-accent-success text-text-primary'
              : 'bg-surface-2 text-text-secondary'
          }`}
        >
          {movie.monitored ? 'Monitored' : 'Unmonitored'}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSearch(movie)}
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => onEdit(movie)}
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs hover:bg-surface-2"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(movie)}
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-accent-danger hover:bg-surface-2"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
