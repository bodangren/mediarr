# Indexer Presets - Implementation Summary

## Overview
This module provides TypeScript definitions for torrent indexer presets imported from Prowlarr C# definitions. It replaces the hardcoded presets with a comprehensive library of popular torrent trackers.

## Files Created

### 1. `app/src/lib/indexer/indexerPresets.ts`
- **Purpose**: Main module defining all indexer presets
- **Exports**:
  - `indexerPresets`: Array of 22+ IndexerPreset objects
  - `getPresetById(id: string)`: Retrieve a preset by ID
  - `getPresetsByProtocol(protocol: 'torrent' | 'usenet')`: Filter by protocol
  - `getPopularPresets()`: Get most commonly used indexers

### 2. `app/src/lib/indexer/indexerPresets.test.ts`
- **Purpose**: Comprehensive test suite (TDD approach)
- **Coverage**: 100% (21 tests passing)
- **Test Categories**:
  - Structure validation
  - Content validation
  - Helper function tests
  - Field validation for different indexer types

## Indexer Presets Included

### General Trackers (6)
1. AlphaRatio - Private 0DAY/GENERAL tracker
2. IPTorrents - Popular private general tracker
3. TorrentDay - Private TV/MOVIES/GENERAL tracker
4. FunFile - Private general tracker
5. SpeedCD - Private general tracker
6. XSpeeds - Private general tracker

### Anime Trackers (4)
1. AnimeBytes - Largest private anime tracker
2. Anidex - Public anime tracker (no auth)
3. BakaBT - Private anime tracker
4. SubsPlease - Public anime fansubs (no auth)

### HD Movie/TV Trackers (5)
1. BeyondHD - Private HD MOVIES/TV tracker
2. HDSpace - Private HD MOVIES/TV tracker
3. HDTorrents - Private HD MOVIES/TV tracker
4. SceneHD - Private HD MOVIES/TV tracker
5. Nebulance - Private TV tracker

### Music Trackers (3) - Gazelle-based
1. Redacted (formerly PassTheHeadphones) - Music tracker
2. GreatPosterWall - Music tracker
3. Orpheus - Music tracker

### Book Trackers (1)
1. MyAnonamouse - EBOOKS/AUDIOBOOKS tracker

### Games Trackers (1)
1. GazelleGames - Games tracker

### Public/Index-Only Trackers (2)
1. Torrents.csv - Public torrent index (no auth)
2. Knaben - Public tracker (no auth)

### German Content Trackers (1)
1. TorrentSyndikat - German content tracker

## Field Types

Each preset defines the following field types:
- `text`: Text input (e.g., username, baseURL)
- `password`: Password input (e.g., API key, password, cookie)
- `boolean`: Checkbox (e.g., freeleech only)
- `number`: Numeric input (not currently used)

## Authentication Methods

### API Key Authentication
Gazelle-based trackers use API key authentication:
- AlphaRatio
- Redacted
- GreatPosterWall
- MyAnonamouse
- GazelleGames
- BeyondHD

### Cookie Authentication
Some trackers require cookie-based authentication:
- IPTorrents
- TorrentDay
- FunFile
- SpeedCD
- XSpeeds
- SceneHD
- Nebulance

### Username/Password Authentication
Traditional login-based authentication:
- AnimeBytes
- BakaBT
- HDSpace
- HDTorrents
- Orpheus
- TorrentSyndikat

### No Authentication
Public trackers that don't require authentication:
- Anidex
- SubsPlease
- Torrents.csv
- Knaben

## Integration with AddIndexerModal

The presets are imported in `app/src/app/(shell)/indexers/page.tsx`:
```typescript
import { getPopularPresets, indexerPresets } from '@/lib/indexer/indexerPresets';

const addIndexerPresets: IndexerPreset[] = [
  ...getPopularPresets(),  // Popular indexers from Prowlarr
  {
    id: 'torznab-generic',  // Generic Torznab for custom indexers
    name: 'Generic Torznab',
    // ...
  },
];
```

## Testing

### Test Coverage
- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

### Running Tests
```bash
npm test -- indexerPresets.test.ts --run
```

### Running with Coverage
```bash
npm test -- --run --coverage src/lib/indexer/
```

## Source Data

The presets are manually created based on the C# indexer definitions in:
`reference/prowlarr/src/NzbDrone.Core/Indexers/Definitions/*.cs`

Key information extracted from each definition:
- Name (e.g., "AlphaRatio")
- Description (e.g., "AlphaRatio(AR) is a Private Torrent Tracker for 0DAY / GENERAL")
- Base URLs
- Authentication method (based on Settings class)
- Privacy level (Private/Public)
- Protocol (always "torrent")

## Future Enhancements

1. **Parser for C# Definitions**: Create automated parser to extract presets from C# files
2. **Additional Presets**: Add remaining 25+ torrent indexers from Prowlarr
3. **Category Mapping**: Include category mappings for each indexer
4. **Advanced Settings**: Expose additional settings like seed ratio, seed time
5. **Validation Rules**: Add per-indexer validation rules

## Maintenance

To add a new indexer:
1. Find the C# definition in `reference/prowlarr/src/NzbDrone.Core/Indexers/Definitions/`
2. Extract the required properties (name, description, base URLs, auth method)
3. Add a new entry to the `indexerPresets` array
4. Run tests to ensure consistency

To add to popular presets:
1. Add the indexer ID to the `popularIds` array in `getPopularPresets()`
2. Ensure the indexer is defined in `indexerPresets`
