import { useEffect, useMemo, useState } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import type { NotificationItem } from '@/lib/api/notificationsApi';

export function SettingsNotificationsPage() {
  const api = useMemo(() => getApiClients(), []);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const items = await api.notificationsApi.list();
      setNotifications(items);
    };

    void load();
  }, [api]);

  return (
    <RouteScaffold title="Notifications" description="Unified notification providers for movie, TV, and system events.">
      <ul className="space-y-2">
        {notifications.length === 0 ? <li className="rounded-md border border-border-subtle bg-surface-1 p-3 text-sm text-text-secondary">No notification integrations configured.</li> : notifications.map(item => (
          <li key={item.id} className="rounded-md border border-border-subtle bg-surface-1 p-3">
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-text-secondary">{item.type} - {item.enabled ? 'Enabled' : 'Disabled'}</p>
          </li>
        ))}
      </ul>
    </RouteScaffold>
  );
}
