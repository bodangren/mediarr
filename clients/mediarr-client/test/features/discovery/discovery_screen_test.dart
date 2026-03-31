import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/discovery/discovery_screen.dart';
import 'package:mediarr_client/features/discovery/discovery_service.dart';

class _MockMdnsAdapter implements MdnsDiscoveryAdapter {
  final _controller = StreamController<DiscoveredServer>.broadcast();
  bool started = false;
  bool stopped = false;

  @override
  Stream<DiscoveredServer> get onServerFound => _controller.stream;

  @override
  Future<void> startDiscovery() async {
    started = true;
  }

  @override
  Future<void> stopDiscovery() async {
    stopped = true;
  }

  void emitServer(DiscoveredServer server) {
    _controller.add(server);
  }

  void dispose() {
    _controller.close();
  }
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(theme: mediarrDarkTheme, home: child);
  }
}

void main() {
  group('DiscoveryScreen', () {
    testWidgets('auto-starts scan on mount', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      expect(
        mockAdapter.started,
        isTrue,
        reason: 'DiscoveryScreen should auto-start mDNS scan in initState',
      );

      mockAdapter.dispose();
    });

    testWidgets('shows scanning indicator while scanning', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      expect(
        find.byType(CircularProgressIndicator),
        findsOneWidget,
        reason: 'Scanning state should show a progress indicator',
      );

      mockAdapter.dispose();
    });

    testWidgets('shows "Searching for server" text while scanning', (
      tester,
    ) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      expect(
        find.text('Searching for server on your network...'),
        findsOneWidget,
      );

      mockAdapter.dispose();
    });

    testWidgets('renders discovered server as a tappable card', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      mockAdapter.emitServer(
        const DiscoveredServer(
          name: 'Test Mediarr',
          host: '192.168.1.42',
          port: 5174,
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Test Mediarr'),
        findsOneWidget,
        reason: 'Server name should be rendered',
      );
      expect(
        find.text('http://192.168.1.42:5174'),
        findsOneWidget,
        reason: 'Server URL should be rendered',
      );
      expect(find.byIcon(Icons.dns), findsOneWidget);

      mockAdapter.dispose();
    });

    testWidgets('shows "Found N server(s)" when servers discovered', (
      tester,
    ) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      mockAdapter.emitServer(
        const DiscoveredServer(
          name: 'Server1',
          host: '192.168.1.10',
          port: 5174,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Found 1 server(s)'), findsOneWidget);

      mockAdapter.dispose();
    });

    testWidgets('accumulates multiple servers', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      mockAdapter.emitServer(
        const DiscoveredServer(
          name: 'Server1',
          host: '192.168.1.10',
          port: 5174,
        ),
      );
      await tester.pumpAndSettle();

      mockAdapter.emitServer(
        const DiscoveredServer(
          name: 'Server2',
          host: '192.168.1.20',
          port: 5174,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Server1'), findsOneWidget);
      expect(find.text('Server2'), findsOneWidget);
      expect(find.text('Found 2 server(s)'), findsOneWidget);

      mockAdapter.dispose();
    });

    testWidgets('shows manual entry fields', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      expect(find.text('Connect manually'), findsOneWidget);
      expect(
        find.widgetWithText(TextField, 'Server IP / Hostname'),
        findsOneWidget,
      );
      expect(find.widgetWithText(TextField, 'Port'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Connect'), findsOneWidget);

      mockAdapter.dispose();
    });

    testWidgets('manual entry has default port 5174', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      final portField = tester.widget<TextField>(
        find.widgetWithText(TextField, 'Port'),
      );
      expect(portField.controller?.text, '5174');

      mockAdapter.dispose();
    });

    testWidgets('shows branding icon and title', (tester) async {
      final mockAdapter = _MockMdnsAdapter();
      final discoveryService = DiscoveryService(
        mdnsAdapter: mockAdapter,
        scanTimeoutDuration: const Duration(seconds: 30),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discoveryServiceProvider.overrideWith((ref) => discoveryService),
          ],
          child: const _TestApp(child: DiscoveryScreen()),
        ),
      );
      await tester.pump();

      expect(find.byIcon(Icons.play_circle_fill), findsOneWidget);
      expect(find.text('Mediarr'), findsOneWidget);

      mockAdapter.dispose();
    });
  });

  group('DiscoveryScreen without provider override (no-op default)', () {
    testWidgets('renders without throwing using NoOpMdnsAdapter', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp(child: DiscoveryScreen())),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mediarr'), findsOneWidget);
      expect(find.text('Connect manually'), findsOneWidget);
    });
  });
}
