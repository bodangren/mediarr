import { parseBoolean } from '../routeUtils';

export interface ParsedLibraryFilters {
  monitored?: boolean;
  status?: string;
  search?: string;
}

/**
 * Extract common library filter parameters (monitored, status, search) from query strings.
 * Used by both movie and series list endpoints.
 */
export function parseLibraryFilters(query: Record<string, unknown>): ParsedLibraryFilters {
  const monitored =
    typeof query.monitored === 'string' || typeof query.monitored === 'boolean'
      ? parseBoolean(query.monitored)
      : undefined;
  const status =
    typeof query.status === 'string' && query.status.trim().length > 0
      ? query.status.toLowerCase()
      : undefined;
  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.toLowerCase()
      : undefined;

  return { monitored, status, search };
}

/**
 * Apply standard monitored/status/search filters to a list of library items.
 */
export function applyLibraryFilters<T extends { monitored?: boolean; status?: string; title?: string }>(
  items: T[],
  filters: ParsedLibraryFilters,
): T[] {
  return items.filter(item => {
    if (filters.monitored !== undefined && item.monitored !== filters.monitored) {
      return false;
    }

    if (filters.status && String(item.status ?? '').toLowerCase() !== filters.status) {
      return false;
    }

    if (filters.search && !String(item.title ?? '').toLowerCase().includes(filters.search)) {
      return false;
    }

    return true;
  });
}
