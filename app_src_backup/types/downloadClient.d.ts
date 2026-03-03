/**
 * Download Client Types
 *
 * Types for download client management (torrent/usenet clients)
 */
import type { DownloadClientItem } from '../lib/api/downloadClientsApi';
export type DownloadClientType = 'transmission' | 'qbittorrent' | 'deluge' | 'rtorrent' | 'sabnzbd' | 'nzbget';
export interface DownloadClient {
    id: number;
    name: string;
    implementation: string;
    configContract: string;
    protocol: string;
    host: string;
    port: number;
    category: string | null;
    priority: number;
    enabled: boolean;
}
export interface DownloadClientDraft {
    name: string;
    implementation: string;
    configContract: string;
    protocol: string;
    host: string;
    port: string;
    username?: string;
    password?: string;
    category?: string;
    priority: number;
    enabled: boolean;
}
export interface DownloadClientHealth {
    failureCount?: number;
    lastErrorMessage?: string | null;
}
export type DownloadClientRow = DownloadClientItem & {
    health?: DownloadClientHealth | null;
};
//# sourceMappingURL=downloadClient.d.ts.map