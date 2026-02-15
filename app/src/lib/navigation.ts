export interface NavigationItem {
  path: string;
  label: string;
  shortLabel: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  { path: '/', label: 'Dashboard', shortLabel: 'Home' },
  { path: '/indexers', label: 'Indexers', shortLabel: 'Indexers' },
  { path: '/indexers/stats', label: 'Indexer Stats', shortLabel: 'Stats' },
  { path: '/search', label: 'Search', shortLabel: 'Search' },
  { path: '/history', label: 'History', shortLabel: 'History' },
  { path: '/system/status', label: 'System', shortLabel: 'System' },
  { path: '/settings', label: 'Settings', shortLabel: 'Settings' },
  { path: '/settings/indexers', label: 'Indexer Settings', shortLabel: 'IdxSet' },
  { path: '/library/series', label: 'Series Library', shortLabel: 'Series' },
  { path: '/library/movies', label: 'Movie Library', shortLabel: 'Movies' },
  { path: '/wanted', label: 'Wanted', shortLabel: 'Wanted' },
  { path: '/queue', label: 'Queue', shortLabel: 'Queue' },
  { path: '/activity', label: 'Activity', shortLabel: 'Activity' },
  { path: '/subtitles', label: 'Subtitles', shortLabel: 'Subs' },
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
  stats: 'Stats',
  search: 'Search',
  history: 'History',
  system: 'System',
  status: 'Status',
  tasks: 'Tasks',
  backup: 'Backup',
  updates: 'Updates',
  events: 'Events',
  logs: 'Logs',
  files: 'Files',
  subtitles: 'Subtitles',
  settings: 'Settings',
  applications: 'Applications',
  downloadclients: 'Download Clients',
  connect: 'Notifications',
  tags: 'Tags',
  general: 'General',
  ui: 'UI',
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
