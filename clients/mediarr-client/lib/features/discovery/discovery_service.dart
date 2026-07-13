import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Represents a discovered Mediarr server on the network.
class DiscoveredServer {
  const DiscoveredServer({
    required this.name,
    required this.host,
    required this.port,
  });

  final String name;
  final String host;
  final int port;

  String get url => 'http://$host:$port';

  @override
  bool operator ==(Object other) =>
      other is DiscoveredServer && other.host == host && other.port == port;

  @override
  int get hashCode => Object.hash(host, port);
}

/// States of the discovery process.
enum DiscoveryPhase { idle, scanning, found, timeout, manual, connected }

/// State for the discovery flow.
class DiscoveryState {
  const DiscoveryState({
    this.phase = DiscoveryPhase.idle,
    this.servers = const [],
    this.selectedServer,
    this.error,
  });

  final DiscoveryPhase phase;
  final List<DiscoveredServer> servers;
  final DiscoveredServer? selectedServer;
  final String? error;

  DiscoveryState copyWith({
    DiscoveryPhase? phase,
    List<DiscoveredServer>? servers,
    DiscoveredServer? selectedServer,
    String? error,
  }) {
    return DiscoveryState(
      phase: phase ?? this.phase,
      servers: servers ?? this.servers,
      selectedServer: selectedServer ?? this.selectedServer,
      error: error,
    );
  }
}

/// Abstract interface for mDNS discovery — allows testing without real network.
abstract class MdnsDiscoveryAdapter {
  Future<void> startDiscovery();
  Future<void> stopDiscovery();
  Stream<DiscoveredServer> get onServerFound;
}

/// Manages the server discovery lifecycle.
class DiscoveryService extends StateNotifier<DiscoveryState> {
  DiscoveryService({
    required this.mdnsAdapter,
    this.scanTimeoutDuration = const Duration(seconds: 10),
  }) : super(const DiscoveryState());

  final MdnsDiscoveryAdapter mdnsAdapter;
  final Duration scanTimeoutDuration;
  Timer? _timeoutTimer;
  StreamSubscription<DiscoveredServer>? _serverSubscription;

  /// Start scanning for servers via mDNS.
  Future<void> startScan() async {
    // A retry can arrive before the previous timeout fires. Tear down the
    // old subscription and timer first so late events cannot leak into the
    // new scan (or fire after this service is disposed).
    await stopScan();

    state = state.copyWith(
      phase: DiscoveryPhase.scanning,
      servers: [],
      error: null,
    );

    _serverSubscription = mdnsAdapter.onServerFound.listen(_onServerFound);

    try {
      await mdnsAdapter.startDiscovery();
    } catch (e) {
      state = state.copyWith(
        phase: DiscoveryPhase.timeout,
        error: 'mDNS discovery failed: $e',
      );
      return;
    }

    _timeoutTimer = Timer(scanTimeoutDuration, _onScanTimeout);
  }

  void _onServerFound(DiscoveredServer server) {
    if (!state.servers.contains(server)) {
      final updated = [...state.servers, server];
      state = state.copyWith(phase: DiscoveryPhase.found, servers: updated);
    }
  }

  void _onScanTimeout() {
    if (state.servers.isEmpty) {
      state = state.copyWith(phase: DiscoveryPhase.timeout);
    }
    // If servers were found, stay in "found" phase
    stopScan();
  }

  /// Stop the current scan.
  Future<void> stopScan() async {
    _timeoutTimer?.cancel();
    _timeoutTimer = null;
    await _serverSubscription?.cancel();
    _serverSubscription = null;
    await mdnsAdapter.stopDiscovery();
  }

  /// Select a discovered server to connect to.
  void selectServer(DiscoveredServer server) {
    state = state.copyWith(
      phase: DiscoveryPhase.connected,
      selectedServer: server,
    );
  }

  /// Manually enter a server address.
  void connectManually(String host, int port) {
    final server = DiscoveredServer(name: 'Manual', host: host, port: port);
    state = state.copyWith(
      phase: DiscoveryPhase.connected,
      selectedServer: server,
    );
  }

  /// Switch to manual entry mode.
  void switchToManual() {
    state = state.copyWith(phase: DiscoveryPhase.manual);
    stopScan();
  }

  @override
  void dispose() {
    stopScan();
    super.dispose();
  }
}

/// A no-op mDNS adapter that never discovers anything.
/// Used as the default so the provider never throws — safe to read without override.
class NoOpMdnsAdapter implements MdnsDiscoveryAdapter {
  @override
  Stream<DiscoveredServer> get onServerFound =>
      const Stream<DiscoveredServer>.empty();

  @override
  Future<void> startDiscovery() async {}

  @override
  Future<void> stopDiscovery() async {}
}

/// Provider for the discovery service.
/// Defaults to a no-op adapter; overridden in main.dart with BonsoirMdnsAdapter.
final discoveryServiceProvider =
    StateNotifierProvider<DiscoveryService, DiscoveryState>((ref) {
      return DiscoveryService(mdnsAdapter: NoOpMdnsAdapter());
    });
