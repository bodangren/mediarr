import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const proxySettingsSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['http', 'socks4', 'socks5']),
  hostname: z.string(),
  port: z.number(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
}).transform(item => ({
  id: item.id,
  name: item.name,
  type: item.type,
  host: item.hostname,
  hostname: item.hostname,
  port: item.port,
  username: item.username ?? undefined,
  password: item.password ?? undefined,
  enabled: item.enabled,
}));

export type ProxySettingsItem = z.infer<typeof proxySettingsSchema>;

export interface ProxySettingsInput {
  name: string;
  type: 'http' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

export function createProxySettingsApi(client: ApiHttpClient) {
  return {
    list(): Promise<ProxySettingsItem[]> {
      return client.request(
        {
          path: routeMap.settingsProxies,
        },
        z.array(proxySettingsSchema),
      );
    },

    create(input: ProxySettingsInput): Promise<ProxySettingsItem> {
      return client.request(
        {
          path: routeMap.settingsProxies,
          method: 'POST',
          body: {
            name: input.name,
            type: input.type,
            hostname: input.host,
            port: input.port,
            username: input.username,
            password: input.password,
            enabled: input.enabled,
          },
        },
        proxySettingsSchema,
      );
    },

    update(id: number, input: Partial<ProxySettingsInput>): Promise<ProxySettingsItem> {
      return client.request(
        {
          path: routeMap.settingsProxy(id),
          method: 'PUT',
          body: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.host !== undefined ? { hostname: input.host } : {}),
            ...(input.port !== undefined ? { port: input.port } : {}),
            ...(input.username !== undefined ? { username: input.username } : {}),
            ...(input.password !== undefined ? { password: input.password } : {}),
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          },
        },
        proxySettingsSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.settingsProxy(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },
  };
}
