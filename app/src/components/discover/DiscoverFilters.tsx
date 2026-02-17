'use client';

import { type DiscoverFilters } from '@/types/discover';
import { mockGenres, mockCertifications, mockLanguages } from '@/lib/mocks/discoverMocks';

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
          {mockGenres.map(genre => (
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
          {mockCertifications.map(cert => (
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
          {mockLanguages.map(lang => (
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
