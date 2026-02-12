import { createApiClients } from './index';

let cachedBaseUrl: string | undefined;
let cachedClient: ReturnType<typeof createApiClients> | undefined;

export function getApiClients() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  if (!cachedClient || cachedBaseUrl !== baseUrl) {
    cachedBaseUrl = baseUrl;
    cachedClient = createApiClients({ baseUrl });
  }

  return cachedClient;
}
