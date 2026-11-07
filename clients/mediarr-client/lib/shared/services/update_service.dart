import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

/// Build-time client identity, used to compare against the server manifest.
///
/// The Flutter tool always provides `FLUTTER_BUILD_NUMBER`, so a build without
/// an explicit `CLIENT_VERSION_CODE` still knows its own versionCode. The old
/// default of 1 made *every* manifest look newer, so the TV offered — and
/// auto-installed after 30 s — a "1.0.6 available" prompt while already
/// running 1.0.6 (device-measured 2026-11-07). A mis-published manifest could
/// therefore downgrade the live client.
int clientVersionCode() {
  const explicit = int.fromEnvironment('CLIENT_VERSION_CODE', defaultValue: 0);
  if (explicit > 0) return explicit;
  const buildNumber = int.fromEnvironment('FLUTTER_BUILD_NUMBER', defaultValue: 0);
  return buildNumber > 0 ? buildNumber : 1;
}

/// Whether [remoteCode] should be offered as an update over [localCode].
///
/// Strictly newer only: equal or older manifests are never offered, so the
/// updater can never downgrade the installed client.
bool shouldOfferUpdate(int remoteCode, int localCode) => remoteCode > localCode;

const String kClientVersionName =
    String.fromEnvironment('MEDIARR_CLIENT_VERSION', defaultValue: 'dev');

class ClientUpdateInfo {
  const ClientUpdateInfo({
    required this.versionCode,
    required this.versionName,
    required this.file,
    required this.size,
    this.notes = '',
  });

  final int versionCode;
  final String versionName;
  final String file;
  final int size;
  final String notes;

  static ClientUpdateInfo? fromJson(Map<String, dynamic> json) {
    final code = json['versionCode'];
    final name = json['versionName'];
    final file = json['file'];
    if (code is! int || name is! String || file is! String) return null;
    return ClientUpdateInfo(
      versionCode: code,
      versionName: name,
      file: file,
      size: json['size'] is int ? json['size'] as int : 0,
      notes: json['notes'] is String ? json['notes'] as String : '',
    );
  }
}

/// Checks the Mediarr server for a newer Android client build and persists the
/// "Wait 12 hours" snooze.
class UpdateService {
  UpdateService(this._client);

  static const String _snoozeKey = 'client_update_snooze_until';
  static const Duration snoozeDuration = Duration(hours: 12);

  final MediarrApiClient _client;

  Future<ClientUpdateInfo?> pendingUpdate() async {
    final prefs = await SharedPreferences.getInstance();
    final snoozedUntil = prefs.getInt(_snoozeKey) ?? 0;
    if (DateTime.now().millisecondsSinceEpoch < snoozedUntil) return null;
    final raw = await _client.fetchClientUpdate();
    if (raw == null) return null;
    final info = ClientUpdateInfo.fromJson(raw);
    if (info == null || !shouldOfferUpdate(info.versionCode, clientVersionCode())) {
      return null;
    }
    return info;
  }

  Future<void> snooze() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _snoozeKey,
      DateTime.now().add(snoozeDuration).millisecondsSinceEpoch,
    );
  }

  Future<String> download(ClientUpdateInfo info, {void Function(int, int)? onProgress}) {
    return _client.downloadClientUpdate(info.file, onProgress: onProgress);
  }
}
