export interface JellyfinSystemIdentity {
  serverId: string;
  serverName: string;
  lanAddress: string;
  port: number;
  version: string;
  operatingSystem?: string | undefined;
  operatingSystemDisplayName?: string | undefined;
  systemArchitecture?: string | undefined;
}

export interface JellyfinPublicSystemInfo {
  ServerName: string;
  Version: string;
  Id: string;
  ProductName: 'Jellyfin Server';
  OperatingSystem: string;
  HasPendingRestart: false;
  SupportsLibraryMonitor: false;
  LocalAddress: string;
  StartupWizardCompleted: true;
}

export interface JellyfinSystemInfo extends JellyfinPublicSystemInfo {
  OperatingSystemDisplayName: string;
  WebSocketPortNumber: number;
  CanSelfRestart: false;
  CanLaunchWebBrowser: false;
  ProgramDataPath: '/config';
  WebPath: '/web';
  CachePath: '/cache';
  LogPath: '/config/log';
  ItemsByNamePath: '/config/metadata';
  InternalMetadataPath: '/config/metadata';
  TranscodingTempPath: '/transcode';
  EncoderPath: '/usr/bin/ffmpeg';
  EncoderPathAvailable: true;
  PackageName: 'jellyfin-server';
  SystemArchitecture: string;
  PackageVersion: string;
}

export interface TrustedLanUserIdentity {
  serverId: string;
  userId: string;
  userName: string;
}

export interface JellyfinUserConfiguration {
  AudioLanguagePreference: string;
  PlayDefaultAudioTrack: boolean;
  SubtitleLanguagePreference: string;
  DisplayMissingEpisodes: boolean;
  GroupedFolders: string[];
  SubtitleMode: 'Default';
  DisplayCollectionsView: boolean;
  EnableLocalPassword: boolean;
  OrderedViews: string[];
  LatestItemsExcludes: string[];
  MyMediaExcludes: string[];
  HidePlayedInLatest: boolean;
  RememberAudioSelections: boolean;
  RememberSubtitleSelections: boolean;
  EnableNextEpisodeAutoPlay: boolean;
}

export interface JellyfinUserPolicy {
  IsAdministrator: boolean;
  IsHidden: boolean;
  IsDisabled: boolean;
  EnableUserPreferenceAccess: boolean;
  EnableRemoteControlOfOtherUsers: boolean;
  EnableSharedDeviceControl: boolean;
  EnableRemoteAccess: boolean;
  EnableLiveTvManagement: boolean;
  EnableLiveTvAccess: boolean;
  EnableMediaPlayback: boolean;
  EnableAudioPlaybackTranscoding: boolean;
  EnableVideoPlaybackTranscoding: boolean;
  EnablePlaybackRemuxing: boolean;
  ForceRemoteSourceTranscoding: boolean;
  EnableContentDeletion: boolean;
  EnableContentDownloading: boolean;
  EnableSyncTranscoding: boolean;
  EnableMediaConversion: boolean;
  EnableAllDevices: boolean;
  EnableAllChannels: boolean;
  EnableAllFolders: boolean;
  InvalidLoginAttemptCount: number;
  LoginAttemptsBeforeLockout: number;
  MaxActiveSessions: number;
  EnablePublicSharing: boolean;
  RemoteClientBitrateLimit: number;
  AuthenticationProviderId: 'Default';
  PasswordResetProviderId: 'Default';
  SyncPlayAccess: 'CreateAndJoinGroups';
}

export interface TrustedLanJellyfinUser {
  Name: string;
  Id: string;
  ServerId: string;
  PrimaryImageTag: null;
  HasPassword: false;
  HasConfiguredPassword: false;
  HasConfiguredEasyPassword: false;
  Configuration: JellyfinUserConfiguration;
  Policy: JellyfinUserPolicy;
}

function requiredText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new RangeError(`${label} must not be empty`);
  }
  return normalized;
}

function formatLocalAddress(identity: JellyfinSystemIdentity): string {
  const address = requiredText(identity.lanAddress, 'LAN address');
  if (address.includes('://')) {
    throw new RangeError('LAN address must be a host or IP address, not a URL');
  }
  if (!Number.isInteger(identity.port) || identity.port < 1 || identity.port > 65_535) {
    throw new RangeError('Jellyfin port must be an integer between 1 and 65535');
  }

  const host = address.includes(':') && !(address.startsWith('[') && address.endsWith(']'))
    ? `[${address}]`
    : address;
  return `http://${host}:${identity.port}`;
}

/** Builds the unauthenticated server identity used for discovery handshakes. */
export function buildJellyfinPublicSystemInfo(
  identity: JellyfinSystemIdentity,
): JellyfinPublicSystemInfo {
  const operatingSystem = identity.operatingSystem?.trim() || 'Linux';

  return {
    ServerName: requiredText(identity.serverName, 'Server name'),
    Version: requiredText(identity.version, 'Server version'),
    Id: requiredText(identity.serverId, 'Server id'),
    ProductName: 'Jellyfin Server',
    OperatingSystem: operatingSystem,
    HasPendingRestart: false,
    SupportsLibraryMonitor: false,
    LocalAddress: formatLocalAddress(identity),
    StartupWizardCompleted: true,
  };
}

/** Builds the known-good, non-sensitive full system information contract. */
export function buildJellyfinSystemInfo(
  identity: JellyfinSystemIdentity,
): JellyfinSystemInfo {
  const publicInfo = buildJellyfinPublicSystemInfo(identity);

  return {
    ...publicInfo,
    OperatingSystemDisplayName:
      identity.operatingSystemDisplayName?.trim() || publicInfo.OperatingSystem,
    WebSocketPortNumber: identity.port,
    CanSelfRestart: false,
    CanLaunchWebBrowser: false,
    ProgramDataPath: '/config',
    WebPath: '/web',
    CachePath: '/cache',
    LogPath: '/config/log',
    ItemsByNamePath: '/config/metadata',
    InternalMetadataPath: '/config/metadata',
    TranscodingTempPath: '/transcode',
    EncoderPath: '/usr/bin/ffmpeg',
    EncoderPathAvailable: true,
    PackageName: 'jellyfin-server',
    SystemArchitecture: identity.systemArchitecture?.trim() || 'X64',
    PackageVersion: publicInfo.Version,
  };
}

/**
 * Builds the single trusted-household user expected by Jellyfin clients.
 * The input deliberately has no password/token field and the function keeps no
 * state, so the compatibility login cannot become credential storage.
 */
export function buildTrustedLanUserDto(
  identity: TrustedLanUserIdentity,
): TrustedLanJellyfinUser {
  return {
    Name: requiredText(identity.userName, 'User name'),
    Id: requiredText(identity.userId, 'User id'),
    ServerId: requiredText(identity.serverId, 'Server id'),
    PrimaryImageTag: null,
    HasPassword: false,
    HasConfiguredPassword: false,
    HasConfiguredEasyPassword: false,
    Configuration: {
      AudioLanguagePreference: '',
      PlayDefaultAudioTrack: true,
      SubtitleLanguagePreference: '',
      DisplayMissingEpisodes: false,
      GroupedFolders: [],
      SubtitleMode: 'Default',
      DisplayCollectionsView: false,
      EnableLocalPassword: false,
      OrderedViews: [],
      LatestItemsExcludes: [],
      MyMediaExcludes: [],
      HidePlayedInLatest: true,
      RememberAudioSelections: true,
      RememberSubtitleSelections: true,
      EnableNextEpisodeAutoPlay: true,
    },
    Policy: {
      IsAdministrator: true,
      IsHidden: false,
      IsDisabled: false,
      EnableUserPreferenceAccess: true,
      EnableRemoteControlOfOtherUsers: true,
      EnableSharedDeviceControl: true,
      EnableRemoteAccess: true,
      EnableLiveTvManagement: true,
      EnableLiveTvAccess: true,
      EnableMediaPlayback: true,
      EnableAudioPlaybackTranscoding: true,
      EnableVideoPlaybackTranscoding: true,
      EnablePlaybackRemuxing: true,
      ForceRemoteSourceTranscoding: false,
      EnableContentDeletion: false,
      EnableContentDownloading: true,
      EnableSyncTranscoding: true,
      EnableMediaConversion: true,
      EnableAllDevices: true,
      EnableAllChannels: true,
      EnableAllFolders: true,
      InvalidLoginAttemptCount: 0,
      LoginAttemptsBeforeLockout: -1,
      MaxActiveSessions: 0,
      EnablePublicSharing: false,
      RemoteClientBitrateLimit: 0,
      AuthenticationProviderId: 'Default',
      PasswordResetProviderId: 'Default',
      SyncPlayAccess: 'CreateAndJoinGroups',
    },
  };
}
