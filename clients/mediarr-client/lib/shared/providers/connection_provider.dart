import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/discovery/discovery_service.dart';
import '../services/api_client.dart';

const _lastServerHostKey = 'last_server_host';
const _lastServerPortKey = 'last_server_port';

/// Orchestrates the connection flow: discovery → connect → persist.
class ConnectionManager {
  ConnectionManager({
    required this.apiClient,
    required this.discoveryService,
  });

  final MediarrApiClient apiClient;
  final DiscoveryService discoveryService;

  /// Try connecting to a discovered or manually entered server.
  Future<bool> connectToServer(DiscoveredServer server) async {
    final success = await apiClient.connect(server.url);
    if (success) {
      discoveryService.selectServer(server);
      await _persistServer(server.host, server.port);
    }
    return success;
  }

  /// Try reconnecting to the last-used server.
  Future<bool> tryReconnectLastServer() async {
    final prefs = await SharedPreferences.getInstance();
    final host = prefs.getString(_lastServerHostKey);
    final port = prefs.getInt(_lastServerPortKey);

    if (host == null || port == null) return false;

    final server = DiscoveredServer(name: 'Last Used', host: host, port: port);
    return connectToServer(server);
  }

  Future<void> _persistServer(String host, int port) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastServerHostKey, host);
    await prefs.setInt(_lastServerPortKey, port);
  }
}

/// Provider for the connection manager.
final connectionManagerProvider = Provider<ConnectionManager>((ref) {
  final apiClient = ref.read(apiClientProvider.notifier);
  // Discovery service must be overridden with a real adapter in main.dart
  // For now, just provide the API client side.
  return ConnectionManager(
    apiClient: apiClient,
    discoveryService: ref.read(discoveryServiceProvider.notifier),
  );
});
