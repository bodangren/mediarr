import { describe, expect, it } from 'vitest';
import SettingsApplicationsPage from './settings/applications/page';
import SettingsConnectPage from './settings/connect/page';
import SettingsDownloadClientsPage from './settings/downloadclients/page';
import SettingsTagsPage from './settings/tags/page';
import SystemBackupPage from './system/backup/page';
import SystemEventsPage from './system/events/page';
import SystemLogFilesPage from './system/logs/files/page';
import SystemStatusPage from './system/status/page';
import SystemTasksPage from './system/tasks/page';
import SystemUpdatesPage from './system/updates/page';

const PAGE_CASES = [
  { route: '/settings/applications', title: 'Settings: Applications', Component: SettingsApplicationsPage },
  { route: '/settings/downloadclients', title: 'Settings: Download Clients', Component: SettingsDownloadClientsPage },
  { route: '/settings/connect', title: 'Settings: Notifications', Component: SettingsConnectPage },
  { route: '/settings/tags', title: 'Settings: Tags', Component: SettingsTagsPage },
  { route: '/system/status', title: 'System: Status', Component: SystemStatusPage },
  { route: '/system/tasks', title: 'System: Tasks', Component: SystemTasksPage },
  { route: '/system/backup', title: 'System: Backup', Component: SystemBackupPage },
  { route: '/system/updates', title: 'System: Updates', Component: SystemUpdatesPage },
  { route: '/system/events', title: 'System: Events', Component: SystemEventsPage },
  { route: '/system/logs/files', title: 'System: Log Files', Component: SystemLogFilesPage },
] as const;

describe('prowlarr route modules', () => {
  it.each(PAGE_CASES)('exports a page component for $title', ({ Component }) => {
    expect(typeof Component).toBe('function');
  });

  it.each(PAGE_CASES)('tracks route path $route', ({ route }) => {
    expect(route.startsWith('/')).toBe(true);
  });
});
