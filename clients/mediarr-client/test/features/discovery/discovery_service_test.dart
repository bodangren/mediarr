import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/discovery/discovery_service.dart';

/// Mock mDNS adapter for testing.
class MockMdnsAdapter implements MdnsDiscoveryAdapter {
  final _controller = StreamController<DiscoveredServer>.broadcast();
  bool started = false;
  bool stopped = false;
  bool shouldFail = false;

  @override
  Future<void> startDiscovery() async {
    if (shouldFail) throw Exception('mDNS unavailable');
    started = true;
  }

  @override
  Future<void> stopDiscovery() async {
    stopped = true;
  }

  @override
  Stream<DiscoveredServer> get onServerFound => _controller.stream;

  void emitServer(DiscoveredServer server) {
    _controller.add(server);
  }

  void dispose() {
    _controller.close();
  }
}

void main() {
  late MockMdnsAdapter mockAdapter;
  late DiscoveryService service;

  const testServer = DiscoveredServer(
    name: 'Mediarr Server',
    host: '192.168.1.100',
    port: 5174,
  );

  const testServer2 = DiscoveredServer(
    name: 'Mediarr Server 2',
    host: '192.168.1.101',
    port: 5174,
  );

  setUp(() {
    mockAdapter = MockMdnsAdapter();
    service = DiscoveryService(
      mdnsAdapter: mockAdapter,
      scanTimeoutDuration: const Duration(milliseconds: 100),
    );
  });

  tearDown(() {
    service.dispose();
    mockAdapter.dispose();
  });

  group('DiscoveredServer', () {
    test('url is computed correctly', () {
      expect(testServer.url, 'http://192.168.1.100:5174');
    });

    test('equality by host and port', () {
      const duplicate = DiscoveredServer(
        name: 'Different Name',
        host: '192.168.1.100',
        port: 5174,
      );
      expect(testServer, equals(duplicate));
    });

    test('different host or port are not equal', () {
      expect(testServer, isNot(equals(testServer2)));
    });
  });

  group('DiscoveryService', () {
    test('initial state is idle', () {
      expect(service.state.phase, DiscoveryPhase.idle);
      expect(service.state.servers, isEmpty);
      expect(service.state.selectedServer, isNull);
    });

    test('startScan transitions to scanning', () async {
      await service.startScan();
      expect(service.state.phase, DiscoveryPhase.scanning);
      expect(mockAdapter.started, true);
    });

    test('found server transitions to found phase', () async {
      await service.startScan();
      mockAdapter.emitServer(testServer);

      // Allow the stream event to propagate
      await Future.delayed(Duration.zero);

      expect(service.state.phase, DiscoveryPhase.found);
      expect(service.state.servers, contains(testServer));
    });

    test('duplicate servers are not added', () async {
      await service.startScan();
      mockAdapter.emitServer(testServer);
      await Future.delayed(Duration.zero);
      mockAdapter.emitServer(testServer);
      await Future.delayed(Duration.zero);

      expect(service.state.servers.length, 1);
    });

    test('multiple unique servers are accumulated', () async {
      await service.startScan();
      mockAdapter.emitServer(testServer);
      await Future.delayed(Duration.zero);
      mockAdapter.emitServer(testServer2);
      await Future.delayed(Duration.zero);

      expect(service.state.servers.length, 2);
      expect(service.state.servers, contains(testServer));
      expect(service.state.servers, contains(testServer2));
    });

    test('timeout with no servers transitions to timeout phase', () async {
      await service.startScan();

      // Wait for the scan timeout
      await Future.delayed(const Duration(milliseconds: 150));

      expect(service.state.phase, DiscoveryPhase.timeout);
      expect(mockAdapter.stopped, true);
    });

    test('timeout with servers found stays in found phase', () async {
      await service.startScan();
      mockAdapter.emitServer(testServer);
      await Future.delayed(Duration.zero);

      // Wait for the scan timeout
      await Future.delayed(const Duration(milliseconds: 150));

      expect(service.state.phase, DiscoveryPhase.found);
    });

    test('selectServer transitions to connected', () async {
      await service.startScan();
      mockAdapter.emitServer(testServer);
      await Future.delayed(Duration.zero);

      service.selectServer(testServer);

      expect(service.state.phase, DiscoveryPhase.connected);
      expect(service.state.selectedServer, testServer);
    });

    test('connectManually transitions to connected', () {
      service.connectManually('10.0.0.5', 5174);

      expect(service.state.phase, DiscoveryPhase.connected);
      expect(service.state.selectedServer?.host, '10.0.0.5');
      expect(service.state.selectedServer?.port, 5174);
      expect(service.state.selectedServer?.name, 'Manual');
    });

    test('switchToManual transitions to manual phase', () async {
      await service.startScan();
      service.switchToManual();

      // switchToManual calls stopScan() which is async — wait for it
      await Future.delayed(Duration.zero);

      expect(service.state.phase, DiscoveryPhase.manual);
      expect(mockAdapter.stopped, true);
    });

    test('mDNS failure transitions to timeout with error', () async {
      mockAdapter.shouldFail = true;
      await service.startScan();

      expect(service.state.phase, DiscoveryPhase.timeout);
      expect(service.state.error, contains('mDNS'));
    });

    test('stopScan cancels timer and stops adapter', () async {
      await service.startScan();
      await service.stopScan();

      expect(mockAdapter.stopped, true);
    });

    test('restarting then stopping a scan ignores late mDNS events', () async {
      await service.startScan();
      await service.startScan();
      await service.stopScan();

      mockAdapter.emitServer(testServer);
      await Future<void>.delayed(Duration.zero);

      expect(service.state.servers, isEmpty);
    });
  });
}
