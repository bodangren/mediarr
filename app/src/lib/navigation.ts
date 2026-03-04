export interface NavigationItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
  showBadge?: boolean;
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}

export const NAV_ITEMS: NavigationSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: 'LayoutDashboard' },
      { path: '/search', label: 'Search', shortLabel: 'Search', icon: 'Search' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    items: [
      { path: '/library/movies', label: 'Movies', shortLabel: 'Movies', icon: 'Film' },
      { path: '/library/tv', label: 'TV Shows', shortLabel: 'TV', icon: 'Tv' },
      { path: '/library/collections', label: 'Collections', shortLabel: 'Collections', icon: 'Layers' },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    items: [
      { path: '/calendar', label: 'Calendar', shortLabel: 'Calendar', icon: 'Calendar' },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    items: [
      { path: '/activity/queue', label: 'Queue', shortLabel: 'Queue', icon: 'List' },
      { path: '/activity/history', label: 'History', shortLabel: 'History', icon: 'History' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { path: '/settings/media', label: 'Media Management', shortLabel: 'Media', icon: 'FolderOpen' },
      { path: '/settings/profiles', label: 'Profiles & Quality', shortLabel: 'Profiles', icon: 'Sliders' },
      { path: '/settings/indexers', label: 'Indexers', shortLabel: 'Indexers', icon: 'Database' },
      { path: '/settings/clients', label: 'Download Client', shortLabel: 'Client', icon: 'Download' },
      { path: '/settings/subtitles', label: 'Subtitles', shortLabel: 'Subtitles', icon: 'Languages' },
      { path: '/settings/streaming', label: 'Streaming', shortLabel: 'Streaming', icon: 'Monitor' },
      { path: '/settings/notifications', label: 'Notifications', shortLabel: 'Notify', icon: 'Bell' },
      { path: '/settings/general', label: 'General', shortLabel: 'General', icon: 'Settings' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { path: '/system/tasks', label: 'Tasks', shortLabel: 'Tasks', icon: 'Cpu' },
      { path: '/system/logs', label: 'Logs', shortLabel: 'Logs', icon: 'FileText' },
      { path: '/system/backup', label: 'Backup', shortLabel: 'Backup', icon: 'HardDriveDownload' },
    ],
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  search: 'Search',
  library: 'Library',
  movies: 'Movies',
  tv: 'TV Shows',
  collections: 'Collections',
  calendar: 'Calendar',
  activity: 'Activity',
  queue: 'Queue',
  history: 'History',
  settings: 'Settings',
  media: 'Media Management',
  profiles: 'Profiles & Quality',
  indexers: 'Indexers',
  clients: 'Download Client',
  subtitles: 'Subtitles',
  streaming: 'Streaming',
  notifications: 'Notifications',
  general: 'General',
  system: 'System',
  tasks: 'Tasks',
  logs: 'Logs',
  backup: 'Backup',
};

export interface BreadcrumbItem {
  href: string;
  label: string;
}

export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/' || pathname === '/dashboard') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ href: '/dashboard', label: 'Dashboard' }];

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
    return pathname === '/dashboard';
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}
