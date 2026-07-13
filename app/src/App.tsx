import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { ActivityQueuePage } from '@/components/activity/ActivityQueuePage';
import { ActivityHistoryPage } from '@/components/activity/ActivityHistoryPage';
import { CalendarPage } from '@/components/calendar/CalendarPage';
import { StatsPage } from '@/components/system/StatsPage';
import { SystemTasksPage } from '@/components/system/SystemTasksPage';
import { SystemLogsPage } from '@/components/system/SystemLogsPage';
import { SystemBackupPage } from '@/components/system/SystemBackupPage';
import { SystemEventsPage } from '@/components/system/SystemEventsPage';
import { CollectionsPage } from '@/components/collections/CollectionsPage';
import { CollectionDetailPage } from '@/components/collections/CollectionDetailPage';
import { SettingsMediaPage } from '@/pages/settings/SettingsMediaPage';
import { SettingsIndexersPage } from '@/pages/settings/SettingsIndexersPage';
import { SettingsClientsPage } from '@/pages/settings/SettingsDownloadClientsPage';
import { SettingsProfilesPage } from '@/pages/settings/SettingsProfilesPage';
import { CustomFormatsSettingsPage } from '@/pages/settings/CustomFormatsSettingsPage';
import { SettingsSubtitlesPage } from '@/pages/settings/SettingsSubtitlesPage';
import { SettingsNotificationsPage } from '@/pages/settings/SettingsNotificationsPage';
import { SettingsStreamingPage } from '@/pages/settings/SettingsStreamingPage';
import { SettingsGeneralPage } from '@/pages/settings/SettingsGeneralPage';
import { SettingsUpdatesPage } from '@/pages/settings/SettingsUpdatesPage';
import { AutomationSettingsPage } from '@/pages/settings/AutomationSettingsPage';
import { SetupWizardPage } from '@/pages/SetupWizardPage';
import { SearchPage } from '@/pages/SearchPage';
import { MoviesLibraryPage } from '@/pages/MoviesLibraryPage';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { SeriesLibraryPage } from '@/pages/SeriesLibraryPage';
import { SeriesDetailPage } from '@/pages/SeriesDetailPage';
import { WantedPage } from '@/pages/WantedPage';
import { getApiClients } from '@/lib/api/client';

export { SettingsClientsPage, SettingsMediaPage, SettingsProfilesPage };

function ShellWrapper({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <AppShell pathname={location.pathname}>{children}</AppShell>;
}

export default function App() {
  const api = useMemo(() => getApiClients(), []);
  const [setupState, setSetupState] = useState<'loading' | 'configured' | 'unconfigured'>('loading');

  useEffect(() => {
    let cancelled = false;

    const loadSetupStatus = async () => {
      try {
        const status = await api.setupApi.getStatus();
        if (!cancelled) {
          setSetupState(status.isConfigured ? 'configured' : 'unconfigured');
        }
      } catch {
        if (!cancelled) {
          // If setup endpoint is unavailable, avoid locking the app behind setup.
          setSetupState('configured');
        }
      }
    };

    void loadSetupStatus();

    return () => {
      cancelled = true;
    };
  }, [api]);

  if (setupState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-text-secondary">
        Checking setup status...
      </div>
    );
  }

  const needsSetup = setupState === 'unconfigured';

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          needsSetup
            ? <SetupWizardPage onCompleted={() => setSetupState('configured')} />
            : <Navigate to="/dashboard" replace />
        }
      />
      <Route path="/" element={<Navigate to={needsSetup ? '/setup' : '/dashboard'} replace />} />
      <Route
        path="/*"
        element={
          needsSetup
            ? <Navigate to="/setup" replace />
            : (
              <ShellWrapper>
                <Routes>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="search" element={<SearchPage />} />

                  <Route path="library/movies" element={<MoviesLibraryPage />} />
                  <Route path="library/movies/:id" element={<MovieDetailPage />} />
                  <Route path="library/tv" element={<SeriesLibraryPage />} />
                  <Route path="library/tv/:id" element={<SeriesDetailPage />} />
                  <Route path="library/series" element={<Navigate to="/library/tv" replace />} />
                  <Route path="library/series/:id" element={<SeriesDetailPage />} />
                  <Route path="library/collections" element={<CollectionsPage />} />
                  <Route path="library/collections/:id" element={<CollectionDetailPage />} />

                  <Route path="wanted" element={<WantedPage />} />

                  <Route path="calendar" element={<CalendarPage />} />

                  <Route path="activity/queue" element={<ActivityQueuePage />} />
                  <Route path="activity/history" element={<ActivityHistoryPage />} />

                  <Route path="settings" element={<Navigate to="/settings/media" replace />} />
                  <Route path="settings/media" element={<SettingsMediaPage />} />
                  <Route path="settings/profiles" element={<SettingsProfilesPage />} />
                  <Route path="settings/custom-formats" element={<CustomFormatsSettingsPage />} />
                  <Route path="settings/indexers" element={<SettingsIndexersPage />} />
                  <Route path="settings/clients" element={<SettingsClientsPage />} />
                  <Route path="settings/subtitles" element={<SettingsSubtitlesPage />} />
                  <Route path="settings/streaming" element={<SettingsStreamingPage />} />
                  <Route path="settings/notifications" element={<SettingsNotificationsPage />} />
                  <Route path="settings/updates" element={<SettingsUpdatesPage />} />
                  <Route path="settings/general" element={<SettingsGeneralPage />} />
                  <Route path="settings/automation" element={<AutomationSettingsPage />} />

                  <Route path="system/tasks" element={<SystemTasksPage />} />
                  <Route path="system/logs" element={<SystemLogsPage />} />
                  <Route path="system/backup" element={<SystemBackupPage />} />
                  <Route path="system/events" element={<SystemEventsPage />} />
                  <Route path="system/stats" element={<StatsPage />} />
                  <Route path="system/status" element={<Navigate to="/system/tasks" replace />} />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </ShellWrapper>
            )
        }
      />
    </Routes>
  );
}
