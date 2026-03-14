
import { type DiscoverFilters } from '@/types/discover';

// Static lists for filter options - these can be replaced with API calls when backend endpoints are available
const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'] as const;
const CERTIFICATIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const;
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Italian'] as const;

interface DiscoverFiltersProps {
  filters: DiscoverFilters;
  onChange: (filters: DiscoverFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

export function DiscoverFilters({ filters, onChange, onApply, onClear }: DiscoverFiltersProps) {
  const handleGenreToggle = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...filters.genres, genre];
    onChange({ ...filters, genres: newGenres });
  };

  return (
    <aside className="space-y-4 rounded-md border border-border-subtle bg-surface-1 p-4">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Year Range</h3>
        <div className="flex gap-2">
          <label className="flex-1 space-y-1 text-sm">
            <span className="text-xs text-text-secondary">Min Year</span>
            <input
              type="number"
              min="1900"
              max="2030"
              value={filters.minYear ?? ''}
              onChange={event => {
                const minYear = event.currentTarget.value ? Number.parseInt(event.currentTarget.value, 10) : undefined;
                onChange({ ...filters, minYear });
              }}
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm"
              placeholder="1900"
            />
          </label>
          <label className="flex-1 space-y-1 text-sm">
            <span className="text-xs text-text-secondary">Max Year</span>
            <input
              type="number"
              min="1900"
              max="2030"
              value={filters.maxYear ?? ''}
              onChange={event => {
                const maxYear = event.currentTarget.value ? Number.parseInt(event.currentTarget.value, 10) : undefined;
                onChange({ ...filters, maxYear });
              }}
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm"
              placeholder="2030"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Genres</h3>
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
          {GENRES.map(genre => (
            <label key={genre} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.genres.includes(genre)}
                onChange={() => handleGenreToggle(genre)}
                className="rounded-sm border-border-subtle bg-surface-0"
              />
              <span className="text-xs text-text-secondary">{genre}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Certification</h3>
        <select
          value={filters.certification ?? ''}
          onChange={event => {
            const certification = event.currentTarget.value || undefined;
            onChange({ ...filters, certification });
          }}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm"
        >
          <option value="">All Certifications</option>
          {CERTIFICATIONS.map(cert => (
            <option key={cert} value={cert}>
              {cert}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Language</h3>
        <select
          value={filters.language ?? ''}
          onChange={event => {
            const language = event.currentTarget.value || undefined;
            onChange({ ...filters, language });
          }}
          className="w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm"
        >
          <option value="">All Languages</option>
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 rounded-sm bg-accent-primary px-3 py-2 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary/90"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={onClear}
          className="flex-1 rounded-sm border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
        >
          Clear
        </button>
      </div>
    </aside>
  );
}
