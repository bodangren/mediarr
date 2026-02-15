export interface NavigationItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}

export const NAV_ITEMS: NavigationSection[] = [
  {
    id: 'media-library',
    label: 'Media Library',
    items: [
      { path: '/library/series', label: 'Series Library', shortLabel: 'Series', icon: 'Tv' },
      { path: '/library/movies', label: 'Movie Library', shortLabel: 'Movies', icon: 'Film' },
    ],
  },
  {
    id: 'indexers-search',
    label: 'Indexers & Search',
    items: [
      { path: '/indexers', label: 'Indexers', shortLabel: 'Indexers', icon: 'Database' },
      { path: '/indexers/stats', label: 'Indexer Stats', shortLabel: 'Stats', icon: 'BarChart3' },
      { path: '/search', label: 'Search', shortLabel: 'Search', icon: 'Search' },
      { path: '/history', label: 'History', shortLabel: 'History', icon: 'History' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { path: '/system/status', label: 'System Status', shortLabel: 'Status', icon: 'Server' },
      { path: '/system/tasks', label: 'System Tasks', shortLabel: 'Tasks', icon: 'Cpu' },
      { path: '/system/backup', label: 'System Backup', shortLabel: 'Backup', icon: 'Archive' },
      { path: '/system/updates', label: 'System Updates', shortLabel: 'Updates', icon: 'Download' },
      { path: '/system/events', label: 'System Events', shortLabel: 'Events', icon: 'AlertCircle' },
      { path: '/system/logs/files', label: 'System Logs', shortLabel: 'Logs', icon: 'FileText' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { path: '/settings', label: 'Settings', shortLabel: 'Settings', icon: 'Settings' },
      { path: '/settings/indexers', label: 'Indexer Settings', shortLabel: 'Indexers', icon: 'Sliders' },
      { path: '/settings/general', label: 'General Settings', shortLabel: 'General', icon: 'Settings' },
      { path: '/settings/ui', label: 'UI Settings', shortLabel: 'UI', icon: 'Palette' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    items: [
      { path: '/wanted', label: 'Wanted', shortLabel: 'Wanted', icon: 'Search' },
      { path: '/queue', label: 'Queue', shortLabel: 'Queue', icon: 'List' },
      { path: '/activity', label: 'Activity', shortLabel: 'Activity', icon: 'Activity' },
      { path: '/subtitles', label: 'Subtitles', shortLabel: 'Subs', icon: 'Subtitles' },
      { path: '/add', label: 'Add Media', shortLabel: 'Add', icon: 'Plus' },
    ],
  },
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
