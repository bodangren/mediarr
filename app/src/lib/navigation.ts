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
    id: 'movies',
    label: 'Movies',
    items: [
      { path: '/movies', label: 'Movies', shortLabel: 'Movies', icon: 'Film' },
      { path: '/add/new', label: 'Add New', shortLabel: 'Add', icon: 'Plus' },
      { path: '/add/import', label: 'Import Library', shortLabel: 'Import', icon: 'Upload' },
      { path: '/collections', label: 'Collections', shortLabel: 'Collections', icon: 'Layers' },
      { path: '/add/discover', label: 'Discover', shortLabel: 'Discover', icon: 'Compass' },
    ],
  },
  {
    id: 'subtitles',
    label: 'Subtitles',
    items: [
      { path: '/subtitles/series', label: 'Series', shortLabel: 'Series', icon: 'Tv' },
      { path: '/subtitles/movies', label: 'Movies', shortLabel: 'Movies', icon: 'Film' },
      { path: '/subtitles/wanted/series', label: 'Wanted Episodes', shortLabel: 'Wanted', icon: 'Search', showBadge: true },
      { path: '/subtitles/wanted/movies', label: 'Wanted Movies', shortLabel: 'Wanted', icon: 'Search', showBadge: true },
      { path: '/subtitles/history/series', label: 'History Episodes', shortLabel: 'History', icon: 'History' },
      { path: '/subtitles/history/movies', label: 'History Movies', shortLabel: 'History', icon: 'History' },
      { path: '/subtitles/blacklist/series', label: 'Blacklist Episodes', shortLabel: 'Blacklist', icon: 'Ban' },
      { path: '/subtitles/blacklist/movies', label: 'Blacklist Movies', shortLabel: 'Blacklist', icon: 'Ban' },
      { path: '/subtitles/profiles', label: 'Language Profiles', shortLabel: 'Profiles', icon: 'Languages' },
      { path: '/subtitles/providers', label: 'Providers', shortLabel: 'Providers', icon: 'Database' },
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
      { path: '/activity/blocklist', label: 'Blocklist', shortLabel: 'Blocklist', icon: 'Ban' },
    ],
  },
  {
    id: 'wanted',
    label: 'Wanted',
    items: [
      { path: '/wanted/missing', label: 'Missing', shortLabel: 'Missing', icon: 'Search' },
      { path: '/wanted/cutoffunmet', label: 'Cutoff Unmet', shortLabel: 'Cutoff', icon: 'AlertTriangle' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { path: '/settings/mediamanagement', label: 'Media Management', shortLabel: 'Media', icon: 'Settings' },
      { path: '/settings/profiles', label: 'Profiles', shortLabel: 'Profiles', icon: 'List' },
      { path: '/settings/quality', label: 'Quality', shortLabel: 'Quality', icon: 'Sliders' },
      { path: '/settings/customformats', label: 'Custom Formats', shortLabel: 'Formats', icon: 'Tag' },
      { path: '/settings/indexers', label: 'Indexers', shortLabel: 'Indexers', icon: 'Database' },
      { path: '/settings/applications', label: 'Applications', shortLabel: 'Apps', icon: 'AppWindow' },
      { path: '/settings/downloadclients', label: 'Download Clients', shortLabel: 'Downloads', icon: 'Download' },
      { path: '/settings/importlists', label: 'Import Lists', shortLabel: 'Lists', icon: 'List' },
      { path: '/settings/connect', label: 'Connect', shortLabel: 'Connect', icon: 'Link' },
      { path: '/settings/notifications', label: 'Notifications', shortLabel: 'Notify', icon: 'Bell' },
      { path: '/settings/metadata', label: 'Metadata', shortLabel: 'Metadata', icon: 'Info' },
      { path: '/settings/tags', label: 'Tags', shortLabel: 'Tags', icon: 'Tag' },
      { path: '/settings/subtitles', label: 'Subtitles', shortLabel: 'Subtitles', icon: 'Languages' },
      { path: '/settings/general', label: 'General', shortLabel: 'General', icon: 'Settings' },
      { path: '/settings/ui', label: 'UI', shortLabel: 'UI', icon: 'Palette' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { path: '/system/status', label: 'Status', shortLabel: 'Status', icon: 'Server' },
      { path: '/system/tasks', label: 'Tasks', shortLabel: 'Tasks', icon: 'Cpu' },
      { path: '/system/backup', label: 'Backup', shortLabel: 'Backup', icon: 'Archive' },
      { path: '/system/updates', label: 'Updates', shortLabel: 'Updates', icon: 'Download' },
      { path: '/system/events', label: 'Events', shortLabel: 'Events', icon: 'AlertCircle' },
      { path: '/system/logs/files', label: 'Log Files', shortLabel: 'Logs', icon: 'FileText' },
    ],
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  movies: 'Movies',
  add: 'Add',
  new: 'Add New',
  import: 'Import',
  collections: 'Collections',
  discover: 'Discover',
  subtitles: 'Subtitles',
  series: 'Series',
  blacklist: 'Blacklist',
  profiles: 'Profiles',
  providers: 'Providers',
  calendar: 'Calendar',
  activity: 'Activity',
  queue: 'Queue',
  history: 'History',
  blocklist: 'Blocklist',
  wanted: 'Wanted',
  missing: 'Missing',
  cutoffunmet: 'Cutoff Unmet',
  settings: 'Settings',
  mediamanagement: 'Media Management',
  quality: 'Quality',
  customformats: 'Custom Formats',
  indexers: 'Indexers',
  applications: 'Applications',
  downloadclients: 'Download Clients',
  importlists: 'Import Lists',
  connect: 'Connect',
  notifications: 'Notifications',
  metadata: 'Metadata',
  tags: 'Tags',
  general: 'General',
  ui: 'UI',
  system: 'System',
  status: 'Status',
  tasks: 'Tasks',
  backup: 'Backup',
  updates: 'Updates',
  events: 'Events',
  logs: 'Logs',
  files: 'Log Files',
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
