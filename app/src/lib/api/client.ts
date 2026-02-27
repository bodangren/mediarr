import { createApiClients } from './index';
import type { MonitoringType } from './mediaApi';

let cachedBaseUrl: string | undefined;
let cachedClient: ReturnType<typeof createApiClients> | undefined;

export function getApiClients() {
  const baseUrl = '';
  if (!cachedClient || cachedBaseUrl !== baseUrl) {
    cachedBaseUrl = baseUrl;
    cachedClient = createApiClients({ baseUrl });
  }

  return cachedClient;
}

export type { MonitoringType };
