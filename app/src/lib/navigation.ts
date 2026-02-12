export interface NavigationItem {
  path: string;
  label: string;
  shortLabel: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  { path: '/', label: 'Dashboard', shortLabel: 'Home' },
  { path: '/library/series', label: 'Series Library', shortLabel: 'Series' },
  { path: '/library/movies', label: 'Movie Library', shortLabel: 'Movies' },
  { path: '/wanted', label: 'Wanted', shortLabel: 'Wanted' },
  { path: '/queue', label: 'Queue', shortLabel: 'Queue' },
  { path: '/activity', label: 'Activity', shortLabel: 'Activity' },
  { path: '/indexers', label: 'Indexers', shortLabel: 'Indexers' },
  { path: '/subtitles', label: 'Subtitles', shortLabel: 'Subs' },
  { path: '/settings', label: 'Settings', shortLabel: 'Settings' },
  { path: '/add', label: 'Add Media', shortLabel: 'Add' },
];

const SEGMENT_LABELS: Record<string, string> = {
  library: 'Library',
  series: 'Series',
  movies: 'Movies',
  wanted: 'Wanted',
  queue: 'Queue',
  activity: 'Activity',
  indexers: 'Indexers',
  subtitles: 'Subtitles',
  settings: 'Settings',
  add: 'Add Media',
};

export interface BreadcrumbItem {
  href: string;
  label: string;
}

export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/') {
    return [{ href: '/', label: 'Dashboard' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ href: '/', label: 'Dashboard' }];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? '';
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isNumeric = /^\d+$/.test(segment);
    const label = isNumeric
      ? `#${segment}`
      : (SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1));

    breadcrumbs.push({ href, label });
  }

  return breadcrumbs;
}

export function isNavActive(pathname: string, target: string): boolean {
  if (target === '/') {
    return pathname === '/';
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}
