import { describe, expect, it } from 'vitest';
import {
  buildJellyfinPublicSystemInfo,
  buildJellyfinSystemInfo,
  buildTrustedLanUserDto,
} from './compatibilityDtos';

describe('Jellyfin system compatibility DTOs', () => {
  const identity = {
    serverId: '0123456789abcdef0123456789abcdef',
    serverName: 'Mediarr',
    lanAddress: '192.168.1.42',
    port: 8096,
    version: '10.10.0',
    operatingSystem: 'Linux',
    operatingSystemDisplayName: 'Linux',
    systemArchitecture: 'X64',
  };

  it('builds the known-good public system shape from injected LAN identity', () => {
    expect(buildJellyfinPublicSystemInfo(identity)).toEqual({
      ServerName: 'Mediarr',
      Version: '10.10.0',
      Id: '0123456789abcdef0123456789abcdef',
      ProductName: 'Jellyfin Server',
      OperatingSystem: 'Linux',
      HasPendingRestart: false,
      SupportsLibraryMonitor: false,
      LocalAddress: 'http://192.168.1.42:8096',
      StartupWizardCompleted: true,
    });
  });

  it('builds the full non-sensitive system shape without dropping public fields', () => {
    expect(buildJellyfinSystemInfo(identity)).toEqual({
      ServerName: 'Mediarr',
      Version: '10.10.0',
      Id: '0123456789abcdef0123456789abcdef',
      ProductName: 'Jellyfin Server',
      OperatingSystem: 'Linux',
      OperatingSystemDisplayName: 'Linux',
      HasPendingRestart: false,
      SupportsLibraryMonitor: false,
      LocalAddress: 'http://192.168.1.42:8096',
      StartupWizardCompleted: true,
      WebSocketPortNumber: 8096,
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
      SystemArchitecture: 'X64',
      PackageVersion: '10.10.0',
    });
  });

  it('formats injected IPv6 LAN addresses and rejects invalid endpoint inputs', () => {
    expect(buildJellyfinPublicSystemInfo({
      ...identity,
      lanAddress: 'fd00::42',
    }).LocalAddress).toBe('http://[fd00::42]:8096');

    expect(() => buildJellyfinPublicSystemInfo({
      ...identity,
      lanAddress: ' ',
    })).toThrow('LAN address');
    expect(() => buildJellyfinPublicSystemInfo({
      ...identity,
      port: 0,
    })).toThrow('port');
  });
});

describe('trusted-LAN Jellyfin user DTO', () => {
  it('matches the known-good user shape with no credential material', () => {
    const dto = buildTrustedLanUserDto({
      serverId: 'server-id',
      userId: 'user-id',
      userName: 'Mediarr',
    });

    expect(dto).toEqual({
      Name: 'Mediarr',
      Id: 'user-id',
      ServerId: 'server-id',
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
    });
    expect(dto).not.toHaveProperty('Password');
    expect(dto).not.toHaveProperty('AccessToken');
  });

  it('is pure and returns independent nested policy/configuration objects', () => {
    const input = Object.freeze({
      serverId: 'server-id',
      userId: 'user-id',
      userName: 'Mediarr',
    });

    const first = buildTrustedLanUserDto(input);
    const second = buildTrustedLanUserDto(input);
    first.Configuration.OrderedViews.push('changed');

    expect(second.Configuration.OrderedViews).toEqual([]);
    expect(input).toEqual({
      serverId: 'server-id',
      userId: 'user-id',
      userName: 'Mediarr',
    });
  });
});
