import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HistoryPage from './history/page';
import SettingsApplicationsPage from './settings/applications/page';
import SettingsConnectPage from './settings/connect/page';
import SettingsDownloadClientsPage from './settings/downloadclients/page';
import SettingsGeneralPage from './settings/general/page';
import SettingsIndexersPage from './settings/indexers/page';
import SettingsTagsPage from './settings/tags/page';
import SettingsUiPage from './settings/ui/page';
import SystemBackupPage from './system/backup/page';
import SystemEventsPage from './system/events/page';
import SystemLogFilesPage from './system/logs/files/page';
import SystemStatusPage from './system/status/page';
import SystemTasksPage from './system/tasks/page';
import SystemUpdatesPage from './system/updates/page';

const PAGE_CASES = [
  { title: 'History', Component: HistoryPage },
  { title: 'Settings: Indexers', Component: SettingsIndexersPage },
  { title: 'Settings: Applications', Component: SettingsApplicationsPage },
  { title: 'Settings: Download Clients', Component: SettingsDownloadClientsPage },
  { title: 'Settings: Notifications', Component: SettingsConnectPage },
  { title: 'Settings: Tags', Component: SettingsTagsPage },
  { title: 'Settings: General', Component: SettingsGeneralPage },
  { title: 'Settings: UI', Component: SettingsUiPage },
  { title: 'System: Status', Component: SystemStatusPage },
  { title: 'System: Tasks', Component: SystemTasksPage },
  { title: 'System: Backup', Component: SystemBackupPage },
  { title: 'System: Updates', Component: SystemUpdatesPage },
  { title: 'System: Events', Component: SystemEventsPage },
  { title: 'System: Log Files', Component: SystemLogFilesPage },
] as const;

describe('prowlarr route scaffolds', () => {
  it.each(PAGE_CASES)('renders scaffold for $title', ({ title, Component }) => {
    render(<Component />);

    expect(
      screen.getByText(
        'This route is scaffolded for Prowlarr parity and will be progressively wired with feature-complete behavior.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });
});
