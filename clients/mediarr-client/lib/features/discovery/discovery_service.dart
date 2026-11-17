import 'dart:async';
import 'dart:io';

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

  /// Probes the local /24 for a Mediarr API (FR: discovery must actually work).
  ///
  /// mDNS alone is not enough on this LAN: the server host routes its traffic
  /// through a VPN, so its multicast advertisement frequently never reaches the
  /// TV and the client can only offer manual entry. A direct HTTP probe of the
  /// subnet needs no multicast, no `.local` name resolution and no server
  /// change, and a hit is exactly the same contract the manual entry uses
  /// (`GET /api/health` answers 200 on a Mediarr server).
  Future<void> _probeSubnet() async {
    List<NetworkInterface> interfaces;
    try {
      interfaces = await NetworkInterface.list(
        includeLoopback: false,
        type: InternetAddressType.IPv4,
      );
    } catch (_) {
      return;
    }

    final prefixes = <String>{};
    for (final interface in interfaces) {
      for (final address in interface.addresses) {
        final raw = address.address;
        // Skip VPN/tunnel addresses (Astrill uses 198.18.0.0/15) and anything
        // that is not a normal private LAN address.
        if (!address.isLoopback &&
            (raw.startsWith('192.168.') ||
                raw.startsWith('10.') ||
                RegExp(r'^172\.(1[6-9]|2\d|3[01])\.').hasMatch(raw))) {
          final parts = raw.split('.');
          if (parts.length == 4) prefixes.add(parts.take(3).join('.'));
        }
      }
    }
    if (prefixes.isEmpty) return;

    final client = HttpClient()
      ..connectionTimeout = const Duration(milliseconds: 400);

    Future<void> probe(String host) async {
      try {
        final request = await client.getUrl(Uri.parse('http://$host:5174/api/health'));
        final response = await request.close().timeout(const Duration(milliseconds: 700));
        await response.drain<void>();
        if (response.statusCode == 200) {
          _onServerFound(DiscoveredServer(name: 'Mediarr', host: host, port: 5174));
        }
      } catch (_) {
        // Nothing at this address; that is the normal case for 253 of 254 hosts.
      }
    }

    for (final prefix in prefixes) {
      final hosts = <String>[for (var i = 1; i <= 254; i++) '$prefix.$i'];
      // Bounded concurrency keeps the probe under a second on a LAN.
      for (var start = 0; start < hosts.length; start += 64) {
        final batch = hosts.skip(start).take(64).map(probe);
        await Future.wait(batch);
      }
    }
    client.close(force: true);
  }

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
    // Runs in parallel with mDNS; whichever finds a server first wins.
    unawaited(_probeSubnet());
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
