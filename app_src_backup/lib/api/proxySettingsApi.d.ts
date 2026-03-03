import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const proxySettingsSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    type: z.ZodEnum<["http", "socks4", "socks5"]>;
    hostname: z.ZodString;
    port: z.ZodNumber;
    username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    password: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "http" | "socks4" | "socks5";
    name: string;
    id: number;
    enabled: boolean;
    port: number;
    hostname: string;
    password?: string | null | undefined;
    username?: string | null | undefined;
}, {
    type: "http" | "socks4" | "socks5";
    name: string;
    id: number;
    port: number;
    hostname: string;
    password?: string | null | undefined;
    enabled?: boolean | undefined;
    username?: string | null | undefined;
}>, {
    id: number;
    name: string;
    type: "http" | "socks4" | "socks5";
    host: string;
    hostname: string;
    port: number;
    username: string | undefined;
    password: string | undefined;
    enabled: boolean;
}, {
    type: "http" | "socks4" | "socks5";
    name: string;
    id: number;
    port: number;
    hostname: string;
    password?: string | null | undefined;
    enabled?: boolean | undefined;
    username?: string | null | undefined;
}>;
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
export declare function createProxySettingsApi(client: ApiHttpClient): {
    list(): Promise<ProxySettingsItem[]>;
    create(input: ProxySettingsInput): Promise<ProxySettingsItem>;
    update(id: number, input: Partial<ProxySettingsInput>): Promise<ProxySettingsItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
};
export {};
//# sourceMappingURL=proxySettingsApi.d.ts.map