import type { IndexerPreset } from '@/app/(shell)/indexers/AddIndexerModal';

/**
 * Indexer presets imported from Prowlarr C# definitions
 * These define common torrent trackers with their configuration schemas
 * Source: reference/prowlarr/src/NzbDrone.Core/Indexers/Definitions/
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
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://alpharatio.cc/' },
    ],
  },
  {
    id: 'anidex',
    name: 'Anidex',
    description: 'Anidex is a Public torrent tracker and indexer, primarily for English fansub groups of anime',
    protocol: 'torrent',
    implementation: 'Anidex',
    configContract: 'AnidexSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://anidex.info/' },
    ],
  },
  {
    id: 'anidub',
    name: 'Anidub',
    description: 'Anidub is RUSSIAN anime voiceover group and eponymous anime tracker',
    protocol: 'torrent',
    implementation: 'Anidub',
    configContract: 'AnidubSettings',
    privacy: 'SemiPrivate',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://tr.anidub.com/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'animebytes',
    name: 'AnimeBytes',
    description: 'AnimeBytes (AB) is the largest private torrent tracker that specialises in anime and anime-related content',
    protocol: 'torrent',
    implementation: 'AnimeBytes',
    configContract: 'AnimeBytesSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://animebytes.tv/' },
    ],
  },
  {
    id: 'animetorrents',
    name: 'AnimeTorrents',
    description: 'Definitive source for anime and manga',
    protocol: 'torrent',
    implementation: 'AnimeTorrents',
    configContract: 'AnimeTorrentsSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://animetorrents.me/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'animedia',
    name: 'Animedia',
    description: 'Animedia is RUSSIAN anime voiceover group and eponymous anime tracker',
    protocol: 'torrent',
    implementation: 'Animedia',
    configContract: 'AnimediaSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://tt.animedia.tv/' },
    ],
  },
  {
    id: 'bakabt',
    name: 'BakaBT',
    description: 'Anime Community',
    protocol: 'torrent',
    implementation: 'BakaBT',
    configContract: 'BakaBTSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://bakabt.me/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'beyondhd',
    name: 'BeyondHD',
    description: 'BeyondHD (BHD) is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'BeyondHD',
    configContract: 'BeyondHDSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://beyond-hd.me/' },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'bithdtv',
    name: 'BitHDTV',
    description: 'BIT-HDTV - Home of High Definition',
    protocol: 'torrent',
    implementation: 'BitHDTV',
    configContract: 'BitHDTVSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://www.bit-hdtv.com/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'broadcasthenet',
    name: 'BroadcasTheNet',
    description: 'BroadcasTheNet (BTN) is an invite-only torrent tracker focused on TV shows',
    protocol: 'torrent',
    implementation: 'BroadcastheNet',
    configContract: 'BroadcastheNetSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://api.broadcasthe.net/' },
    ],
  },
  {
    id: 'brokenstones',
    name: 'BrokenStones',
    description: 'BrokenStones is a Private Torrent Tracker for MAC APPS / GAMES',
    protocol: 'torrent',
    implementation: 'BrokenStones',
    configContract: 'BrokenStonesSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://brokenstones.is/' },
    ],
  },
  {
    id: 'cgpeers',
    name: 'CGPeers',
    description: 'CGPeers is a Private Torrent Tracker for GRAPHICS / SOFTWARE',
    protocol: 'torrent',
    implementation: 'CGPeers',
    configContract: 'CGPeersSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://cgpeers.to/' },
    ],
  },
  {
    id: 'cinemaz',
    name: 'CinemaZ',
    description: 'CinemaZ is a Private Torrent Tracker for Foreign Movies',
    protocol: 'torrent',
    implementation: 'CinemaZ',
    configContract: 'CinemaZSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://cinemaz.to/' },
    ],
  },
  {
    id: 'dicmusic',
    name: 'DICMusic',
    description: 'DICMusic is a CHINESE Private Torrent Tracker for MUSIC',
    protocol: 'torrent',
    implementation: 'DICMusic',
    configContract: 'DICMusicSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://dicmusic.club/' },
    ],
  },
  {
    id: 'exoticaz',
    name: 'ExoticaZ',
    description: 'ExoticaZ (YourExotic) is a Private Torrent Tracker for XXX',
    protocol: 'torrent',
    implementation: 'ExoticaZ',
    configContract: 'ExoticaZSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://exoticaz.to/' },
    ],
  },
  {
    id: 'funfile',
    name: 'FunFile',
    description: 'FunFile (FF) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'FunFile',
    configContract: 'FunFileSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://funfile.org/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'gazellegames',
    name: 'GazelleGames',
    description: 'GazelleGames (GGn) is a Private Torrent Tracker for GAMES',
    protocol: 'torrent',
    implementation: 'GazelleGames',
    configContract: 'GazelleGamesSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://gazellegames.net/' },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'greatposterwall',
    name: 'GreatPosterWall',
    description: 'GreatPosterWall (GPW) is a CHINESE Private Torrent Tracker for MOVIES / MUSIC',
    protocol: 'torrent',
    implementation: 'GreatPosterWall',
    configContract: 'GreatPosterWallSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://greatposterwall.com/' },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'hdspace',
    name: 'HDSpace',
    description: 'HDSpace is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'HDSpace',
    configContract: 'HDSpaceSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://hd-space.org/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'hdtorrents',
    name: 'HDTorrents',
    description: 'HDTorrents is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'HDTorrents',
    configContract: 'HDTorrentsSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://hd-torrents.org/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'iptorrents',
    name: 'IPTorrents',
    description: 'IPTorrents (IPT) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'IPTorrents',
    configContract: 'IPTorrentsSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://iptorrents.com/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'immortalseed',
    name: 'ImmortalSeed',
    description: 'ImmortalSeed (iS) is a Private Torrent Tracker for MOVIES / TV / GENERAL',
    protocol: 'torrent',
    implementation: 'ImmortalSeed',
    configContract: 'ImmortalSeedSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://immortalseed.me/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'knaben',
    name: 'Knaben',
    description: 'Knaben is a Public torrent tracker and indexer',
    protocol: 'torrent',
    implementation: 'Knaben',
    configContract: 'KnabenSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://knaben.eu/' },
    ],
  },
  {
    id: 'libble',
    name: 'Libble',
    description: 'Libble is a Private Torrent Tracker for MUSIC',
    protocol: 'torrent',
    implementation: 'Libble',
    configContract: 'LibbleSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://libble.me/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'mteamtp',
    name: 'MTeamTp',
    description: 'MTeam is a CHINESE Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'MTeamTp',
    configContract: 'MTeamTpSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://kp.m-team.cc/' },
    ],
  },
  {
    id: 'myanonamouse',
    name: 'MyAnonamouse',
    description: 'MyAnonamouse (MAM) is a Private Torrent Tracker for EBOOKS / AUDIOBOOKS',
    protocol: 'torrent',
    implementation: 'MyAnonamouse',
    configContract: 'MyAnonamouseSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://myanonamouse.net/' },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'nebulance',
    name: 'Nebulance',
    description: 'Nebulance (NBL) is a Private Torrent Tracker for TV',
    protocol: 'torrent',
    implementation: 'Nebulance',
    configContract: 'NebulanceSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://nebulance.io/' },
    ],
  },
  {
    id: 'norbits',
    name: 'NorBits',
    description: 'NorBits is a NORWEGIAN Private Torrent Tracker for MOVIES / TV',
    protocol: 'torrent',
    implementation: 'NorBits',
    configContract: 'NorBitsSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://norbits.net/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'orpheus',
    name: 'Orpheus',
    description: 'Orpheus (OPS) is a Private Torrent Tracker for MUSIC',
    protocol: 'torrent',
    implementation: 'Orpheus',
    configContract: 'OrpheusSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://orpheus.network/' },
    ],
  },
  {
    id: 'passthepopcorn',
    name: 'PassThePopcorn',
    description: 'PassThePopcorn (PTP) is a Private Torrent Tracker for MOVIES',
    protocol: 'torrent',
    implementation: 'PassThePopcorn',
    configContract: 'PassThePopcornSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://passthepopcorn.me/' },
    ],
  },
  {
    id: 'pixelhd',
    name: 'PixelHD',
    description: 'PixelHD is a Private Torrent Tracker for HD MOVIES',
    protocol: 'torrent',
    implementation: 'PixelHD',
    configContract: 'PixelHDSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://pixelhd.me/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'pretome',
    name: 'PreToMe',
    description: 'PreToMe (PTM) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'PreToMe',
    configContract: 'PreToMeSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://pretome.info/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'privatehd',
    name: 'PrivateHD',
    description: 'PrivateHD is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'PrivateHD',
    configContract: 'PrivateHDSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://privatehd.to/' },
    ],
  },
  {
    id: 'rarbg',
    name: 'Rarbg',
    description: 'RARBG is a Public torrent tracker for MOVIES / TV (Note: Site offline, for reference only)',
    protocol: 'torrent',
    implementation: 'Rarbg',
    configContract: 'RarbgSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://rarbg.to/' },
    ],
  },
  {
    id: 'redacted',
    name: 'Redacted',
    description: 'Redacted (RED) is a Private Torrent Tracker for MUSIC',
    protocol: 'torrent',
    implementation: 'Redacted',
    configContract: 'RedactedSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://redacted.sh/' },
    ],
  },
  {
    id: 'retroflix',
    name: 'RetroFlix',
    description: 'RetroFlix is a Private Torrent Tracker for CLASSIC MOVIES / TV',
    protocol: 'torrent',
    implementation: 'RetroFlix',
    configContract: 'RetroFlixSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://retroflix.club/' },
    ],
  },
  {
    id: 'revolutiontt',
    name: 'RevolutionTT',
    description: 'RevolutionTT (RTT) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'RevolutionTT',
    configContract: 'RevolutionTTSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://revolutiontt.me/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'rutracker',
    name: 'RuTracker',
    description: 'RuTracker is a RUSSIAN Semi-Private Torrent Tracker for MOVIES / TV / GENERAL',
    protocol: 'torrent',
    implementation: 'RuTracker',
    configContract: 'RuTrackerSettings',
    privacy: 'SemiPrivate',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://rutracker.org/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'scenehd',
    name: 'SceneHD',
    description: 'SceneHD is a Private Torrent Tracker for HD MOVIES / TV',
    protocol: 'torrent',
    implementation: 'SceneHD',
    configContract: 'SceneHDSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://scenehd.org/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'scenetime',
    name: 'SceneTime',
    description: 'SceneTime (ST) is a Private Torrent Tracker for MOVIES / TV / GENERAL',
    protocol: 'torrent',
    implementation: 'SceneTime',
    configContract: 'SceneTimeSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://www.scenetime.com/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'secretcinema',
    name: 'SecretCinema',
    description: 'SecretCinema is a Private Torrent Tracker for MOVIES',
    protocol: 'torrent',
    implementation: 'SecretCinema',
    configContract: 'SecretCinemaSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://secret-cinema.pw/' },
    ],
  },
  {
    id: 'shazbat',
    name: 'Shazbat',
    description: 'Shazbat is a Private Torrent Tracker for TV',
    protocol: 'torrent',
    implementation: 'Shazbat',
    configContract: 'ShazbatSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://www.shazbat.tv/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'shizaproject',
    name: 'Shizaproject',
    description: 'Shizaproject is a RUSSIAN Public torrent tracker for ANIME',
    protocol: 'torrent',
    implementation: 'Shizaproject',
    configContract: 'ShizaprojectSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://shiza-project.com/' },
    ],
  },
  {
    id: 'speedcd',
    name: 'SpeedCD',
    description: 'SpeedCD is a Private Torrent Tracker for GENERAL',
    protocol: 'torrent',
    implementation: 'SpeedCD',
    configContract: 'SpeedCDSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://speed.cd/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'subsplease',
    name: 'SubsPlease',
    description: 'SubsPlease is a Public torrent tracker for anime fansubs',
    protocol: 'torrent',
    implementation: 'SubsPlease',
    configContract: 'SubsPleaseSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://subsplease.org/' },
    ],
  },
  {
    id: 'toloka',
    name: 'Toloka',
    description: 'Toloka is a RUSSIAN Semi-Private Torrent Tracker',
    protocol: 'torrent',
    implementation: 'Toloka',
    configContract: 'TolokaSettings',
    privacy: 'SemiPrivate',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://toloka.to/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'torrentbytes',
    name: 'TorrentBytes',
    description: 'TorrentBytes (TBy) is a Private Torrent Tracker for 0DAY / GENERAL',
    protocol: 'torrent',
    implementation: 'TorrentBytes',
    configContract: 'TorrentBytesSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://www.torrentbytes.net/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'torrentday',
    name: 'TorrentDay',
    description: 'TorrentDay (TD) is a Private Torrent Tracker for MOVIES / TV / GENERAL',
    protocol: 'torrent',
    implementation: 'TorrentDay',
    configContract: 'TorrentDaySettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://tday.love/' },
      { name: 'cookie', label: 'Cookie', type: 'password', required: true },
      { name: 'freeLeechOnly', label: 'Freeleech Only', type: 'boolean', defaultValue: false },
    ],
  },
  {
    id: 'torrentscsv',
    name: 'TorrentsCSV',
    description: 'Torrents.csv is a Public torrent index',
    protocol: 'torrent',
    implementation: 'TorrentsCSV',
    configContract: 'TorrentsCSVSettings',
    privacy: 'Public',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://torrents-csv.ml/' },
    ],
  },
  {
    id: 'torrentsyndikat',
    name: 'TorrentSyndikat',
    description: 'TorrentSyndikat is a GERMAN Private Torrent Tracker',
    protocol: 'torrent',
    implementation: 'TorrentSyndikat',
    configContract: 'TorrentSyndikatSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://torrent-syndikat.org/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'uniotaku',
    name: 'Uniotaku',
    description: 'Uniotaku is a BRAZILIAN Semi-Private Torrent Tracker for ANIME',
    protocol: 'torrent',
    implementation: 'Uniotaku',
    configContract: 'UniotakuSettings',
    privacy: 'SemiPrivate',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://www.uniotaku.com/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'xspeeds',
    name: 'XSpeeds',
    description: 'XSpeeds is a Private Torrent Tracker for GENERAL',
    protocol: 'torrent',
    implementation: 'XSpeeds',
    configContract: 'XSpeedsSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://xspeeds.eu/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  {
    id: 'zonaq',
    name: 'ZonaQ',
    description: 'ZonaQ is a SPANISH Private Torrent Tracker for MOVIES / TV',
    protocol: 'torrent',
    implementation: 'ZonaQ',
    configContract: 'ZonaQSettings',
    privacy: 'Private',
    fields: [
      { name: 'baseUrl', label: 'Base URL', type: 'text', required: true, defaultValue: 'https://zonaq.pw/' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
];

/**
 * Get a preset by its ID
 */
export function getPresetById(id: string): IndexerPreset | undefined {
  return indexerPresets.find((preset) => preset.id === id);
}

/**
 * Get all presets for a specific protocol
 */
export function getPresetsByProtocol(protocol: 'torrent' | 'usenet'): IndexerPreset[] {
  return indexerPresets.filter((preset) => preset.protocol === protocol);
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
    'passthepopcorn',
    'broadcasthenet',
    'orpheus',
    'knaben',
    'subsplease',
  ];

  return popularIds
    .map((id) => getPresetById(id))
    .filter((preset): preset is IndexerPreset => preset !== undefined);
}

/**
 * Get presets by privacy type
 */
export function getPresetsByPrivacy(privacy: 'Public' | 'SemiPrivate' | 'Private'): IndexerPreset[] {
  return indexerPresets.filter((preset) => preset.privacy === privacy);
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): IndexerPreset[] {
  const lowercaseQuery = query.toLowerCase();
  return indexerPresets.filter(
    (preset) =>
      preset.name.toLowerCase().includes(lowercaseQuery) ||
      preset.description.toLowerCase().includes(lowercaseQuery)
  );
}
