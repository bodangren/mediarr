/**
 * Download Client Types
 *
 * Types retained for legacy modal components that may reference them.
 * The multi-client management UI has been replaced by a single-instance
 * settings form backed by TorrentLimitsSettings in downloadClientsApi.ts.
 */

export type DownloadClientType =
  | 'transmission'
  | 'qbittorrent'
  | 'deluge'
  | 'rtorrent'
  | 'sabnzbd'
  | 'nzbget';

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
