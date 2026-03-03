import type { IndexerPreset } from '@/app/(shell)/indexers/AddIndexerModal';
/**
 * Indexer presets imported from Prowlarr C# definitions
 * These define common torrent trackers with their configuration schemas
 * Source: reference/prowlarr/src/NzbDrone.Core/Indexers/Definitions/
 */
export declare const indexerPresets: IndexerPreset[];
/**
 * Get a preset by its ID
 */
export declare function getPresetById(id: string): IndexerPreset | undefined;
/**
 * Get all presets for a specific protocol
 */
export declare function getPresetsByProtocol(protocol: 'torrent' | 'usenet'): IndexerPreset[];
/**
 * Get popular/recommended presets
 * These are the most commonly used indexers
 */
export declare function getPopularPresets(): IndexerPreset[];
/**
 * Get presets by privacy type
 */
export declare function getPresetsByPrivacy(privacy: 'Public' | 'SemiPrivate' | 'Private'): IndexerPreset[];
/**
 * Search presets by name or description
 */
export declare function searchPresets(query: string): IndexerPreset[];
//# sourceMappingURL=indexerPresets.d.ts.map