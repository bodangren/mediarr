import type { IndexerPreset } from '@/app/(shell)/indexers/AddIndexerModal';

/**
 * Indexer presets imported from Prowlarr C# definitions
 * These define common torrent trackers with their configuration schemas
 */

export const indexerPresets: IndexerPreset[] = [
  // General Torrent Trackers
  {
    id: 'alpharatio',
    name: 'AlphaRatio',
    description: 'AlphaRatio(AR) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'AlphaRatio',
    configContract: 'AlphaRatioSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://alpharatio.cc/',
      },
      {
        name: 'apikey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
      {
        name: 'freeleechOnly',
        label: 'Freeleech Only',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'iptorrents',
    name: 'IPTorrents',
    description: 'IPTorrents (IPT) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'IPTorrents',
    configContract: 'IPTorrentsSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://iptorrents.com/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
      {
        name: 'userAgent',
        label: 'User Agent',
        type: 'text',
      },
      {
        name: 'freeLeechOnly',
        label: 'Freeleech Only',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'torrentday',
    name: 'TorrentDay',
    description: 'TorrentDay (TD) is a Private site for TV / MOVIES / GENERAL',
    protocol: 'torrent',
    implementation: 'TorrentDay',
    configContract: 'TorrentDaySettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://tday.love/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
      {
        name: 'freeLeechOnly',
        label: 'Freeleech Only',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'funfile',
    name: 'FunFile',
    description: 'FunFile (FF) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'FunFile',
    configContract: 'FunFileSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://funfile.org/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'speedcd',
    name: 'SpeedCD',
    description: 'SpeedCD is a Private Torrent Tracker for GENERAL',
    protocol: 'torrent',
    implementation: 'SpeedCD',
    configContract: 'SpeedCDSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://speed.cd/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'xspeeds',
    name: 'XSpeeds',
    description: 'XSpeeds is a Private Torrent Tracker for GENERAL',
    protocol: 'torrent',
    implementation: 'XSpeeds',
    configContract: 'XSpeedsSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://xspeeds.eu/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
    ],
  },

  // Anime Trackers
  {
    id: 'animebytes',
    name: 'AnimeBytes',
    description: 'AnimeBytes (AB) is the largest private torrent tracker that specialises in anime and anime-related content',
    protocol: 'torrent',
    implementation: 'AnimeBytes',
    configContract: 'AnimeBytesSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://animebytes.tv/',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'anidex',
    name: 'Anidex',
    description: 'Anidex is a Public torrent tracker and indexer, primarily for English fansub groups of anime',
    protocol: 'torrent',
    implementation: 'Anidex',
    configContract: 'AnidexSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://anidex.info/',
      },
      {
        name: 'authorisedOnly',
        label: 'Authorised Only',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'bakabt',
    name: 'BakaBT',
    description: 'BakaBT (BBT) is a Private Torrent Tracker for ANIME',
    protocol: 'torrent',
    implementation: 'BakaBT',
    configContract: 'BakaBTSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://bakabt.me/',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'subsplease',
    name: 'SubsPlease',
    description: 'SubsPlease is a Public torrent tracker for anime fansubs',
    protocol: 'torrent',
    implementation: 'SubsPlease',
    configContract: 'SubsPleaseSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://subsplease.org/',
      },
    ],
  },

  // HD Movie/TV Trackers
  {
    id: 'beyondhd',
    name: 'BeyondHD',
    description: 'BeyondHD (BHD) is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'BeyondHD',
    configContract: 'BeyondHDSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://beyond-hd.me/',
      },
      {
        name: 'apikey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'hdspace',
    name: 'HDSpace',
    description: 'HDSpace is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'HDSpace',
    configContract: 'HDSpaceSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://hd-space.org/',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'hdtorrents',
    name: 'HDTorrents',
    description: 'HDTorrents is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'HDTorrents',
    configContract: 'HDTorrentsSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://hd-torrents.org/',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'scenehd',
    name: 'SceneHD',
    description: 'SceneHD is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'SceneHD',
    configContract: 'SceneHDSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://scenehd.org/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'nebulance',
    name: 'Nebulance',
    description: 'Nebulance is a Private Torrent Tracker for TV',
    protocol: 'torrent',
    implementation: 'Nebulance',
    configContract: 'NebulanceSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://nebulance.io/',
      },
      {
        name: 'cookie',
        label: 'Cookie',
        type: 'password',
        required: true,
      },
    ],
  },

  // Music Trackers (Gazelle-based)
  {
    id: 'redacted',
    name: 'Redacted',
    description: 'REDActed (Aka.PassTheHeadPhones) is one of most well-known music trackers',
    protocol: 'torrent',
    implementation: 'Redacted',
    configContract: 'RedactedSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://redacted.sh/',
      },
      {
        name: 'apikey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'greatposterwall',
    name: 'GreatPosterWall',
    description: 'GreatPosterWall (GPW) is a Private Torrent Tracker for MUSIC',
    protocol: 'torrent',
    implementation: 'GreatPosterWall',
    configContract: 'GreatPosterWallSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://greatposterwall.com/',
      },
      {
        name: 'apikey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    id: 'orpheus',
    name: 'Orpheus',
    description: 'Orpheus (OPS) is a Private Torrent Tracker for MUSIC',
    protocol: 'torrent',
    implementation: 'Orpheus',
    configContract: 'OrpheusSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://orpheus.network/',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
  },

  // Book Trackers
  {
    id: 'myanonamouse',
    name: 'MyAnonamouse',
    description: 'MyAnonamouse (MAM) is a Private Torrent Tracker for EBOOKS / AUDIOBOOKS',
    protocol: 'torrent',
    implementation: 'MyAnonamouse',
    configContract: 'MyAnonamouseSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://myanonamouse.net/',
      },
      {
        name: 'apikey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
    ],
  },

  // Games Trackers
  {
    id: 'gazellegames',
    name: 'GazelleGames',
    description: 'GazelleGames (GGn) is a Private Torrent Tracker for GAMES',
    protocol: 'torrent',
    implementation: 'GazelleGames',
    configContract: 'GazelleGamesSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://gazellegames.net/',
      },
      {
        name: 'apikey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
    ],
  },

  // Public Indexers
  {
    id: 'torrentscsv',
    name: 'Torrents.csv',
    description: 'Torrents.csv is a Public torrent index - a searchable database of torrents',
    protocol: 'torrent',
    implementation: 'TorrentsCSV',
    configContract: 'TorrentsCSVSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://torrents.csv/',
      },
    ],
  },
  {
    id: 'knaben',
    name: 'Knaben',
    description: 'Knaben is a Public torrent tracker and indexer',
    protocol: 'torrent',
    implementation: 'Knaben',
    configContract: 'KnabenSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://knaben.eu/',
      },
    ],
  },

  // German Content
  {
    id: 'torrentsyndikat',
    name: 'TorrentSyndikat',
    description: 'TorrentSyndikat is a Private Torrent Tracker for GERMAN CONTENT',
    protocol: 'torrent',
    implementation: 'TorrentSyndikat',
    configContract: 'TorrentSyndikatSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://torrent-syndikat.org/',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
  },

  // Additional Public/Index-only trackers (no auth required)
  {
    id: 'animedia',
    name: 'Animedia',
    description: 'Animedia is a Public torrent tracker for anime',
    protocol: 'torrent',
    implementation: 'Animedia',
    configContract: 'AnimediaSettings',
    fields: [
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        defaultValue: 'https://animedia.cc/',
      },
    ],
  },
];

/**
 * Get a preset by its ID
 */
export function getPresetById(id: string): IndexerPreset | undefined {
  return indexerPresets.find(preset => preset.id === id);
}

/**
 * Get all presets for a specific protocol
 */
export function getPresetsByProtocol(protocol: 'torrent' | 'usenet'): IndexerPreset[] {
  return indexerPresets.filter(preset => preset.protocol === protocol);
}

/**
 * Get popular/recommended presets
 * These are the most commonly used indexers
 */
export function getPopularPresets(): IndexerPreset[] {
  const popularIds = [
    'iptorrents',
    'torrentday',
    'alpharatio',
    'beyondhd',
    'animebytes',
    'redacted',
    'myanonamouse',
    'gazellegames',
    'anidex',
    'scenehd',
    'nebulance',
    'greatposterwall',
    'hdspace',
    'hdtorrents',
    'funfile',
  ];

  return popularIds
    .map(id => getPresetById(id))
    .filter((preset): preset is IndexerPreset => preset !== undefined);
}
