import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/providers/connection_provider.dart';
import 'discovery_service.dart';

/// Server discovery screen shown on first launch.
///
/// Phase 4b: host TextField autofocuses so the on-screen TV keyboard opens
/// immediately. Connect button is FocusableAction-reachable via Down.
class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen>
    with WidgetsBindingObserver {
  final _hostController = TextEditingController();
  final _portController = TextEditingController(text: '5174');
  final FocusNode _hostFocusNode = FocusNode(debugLabel: 'DiscoveryScreen.host');
  final FocusNode _portFocusNode = FocusNode(debugLabel: 'DiscoveryScreen.port');
  bool _isConnecting = false;
  bool _attemptedAutoconnect = false;
  bool _autoConnecting = false;

  /// How often the screen retries discovery while nothing has been found.
  static const Duration _retryInterval = Duration(seconds: 4);

  /// After this many quick attempts the screen keeps looking, but slower.
  static const int _fastRetries = 15;

  Timer? _retryTimer;
  int _retries = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(discoveryServiceProvider.notifier).startScan();
      _scheduleRetry();
    });
  }

  /// Keeps looking for the server instead of parking the owner at a text field.
  ///
  /// Measured 2026-11-19: after the TV slept, the app came back showing "No
  /// servers found. Try manual entry." with the system keyboard already up and a
  /// stale 192.168.1.100 in the field, while the server was up — the boot-time
  /// probe had simply run before the network was ready. One failed probe must not
  /// become a typing job on a remote.
  void _scheduleRetry() {
    _retryTimer?.cancel();
    if (!mounted) return;
    final interval = _retries < _fastRetries ? _retryInterval : const Duration(seconds: 15);
    _retryTimer = Timer(interval, () {
      if (!mounted || _isConnecting || _autoConnecting) return;
      final state = ref.read(discoveryServiceProvider);
      // Only start a new scan once the previous one has finished; rescanning a
      // running scan is what used to double-cancel its subscription and hang.
      if (state.phase != DiscoveryPhase.timeout && state.phase != DiscoveryPhase.idle) {
        _scheduleRetry();
        return;
      }
      _retries += 1;
      _attemptedAutoconnect = false;
      ref.read(discoveryServiceProvider.notifier).startScan();
      _scheduleRetry();
    });
  }

  /// A TV that just woke needs the scan to run again: the network comes up a
  /// moment after resume, so the boot-time probe is the one most likely to fail.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    _retries = 0;
    _scheduleRetry();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _retryTimer?.cancel();
    _hostController.dispose();
    _portController.dispose();
    _hostFocusNode.dispose();
    _portFocusNode.dispose();
    super.dispose();
  }

  /// Connects automatically when discovery finds exactly one Mediarr server.
  ///
  /// The household has one server, so making the owner type an IP with a remote
  /// is pure friction — and a TV remote cannot type at all without the on-screen
  /// keyboard. With >1 server the list stays and the owner chooses.
  void _maybeAutoConnect(DiscoveryState state) {
    if (_autoConnecting || _isConnecting) return;
    if (state.servers.length != 1) return;
    _autoConnecting = true;
    final server = state.servers.single;
    unawaited(_connectToServer(server.host, server.port));
  }

  Future<void> _connectToServer(String host, int port) async {
    setState(() => _isConnecting = true);
    final manager = ref.read(connectionManagerProvider);
    final success = await manager.connectToServer(
      DiscoveredServer(name: 'Manual', host: host, port: port),
    );
    if (!mounted) return;
    if (success) {
      context.go(AppRoutes.home);
    } else {
      setState(() => _isConnecting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not connect to $host:$port'),
          backgroundColor: MediarrColors.statusError,
        ),
      );
    }
  }

  void _onHostSubmitted(String _) {
    _portFocusNode.requestFocus();
  }

  void _onPortSubmitted(String _) {
    _onConnectPressed();
  }

  void _onConnectPressed() {
    final host = _hostController.text.trim();
    final port = int.tryParse(_portController.text.trim()) ?? 5174;
    if (host.isNotEmpty) {
      _connectToServer(host, port);
    } else {
      _hostFocusNode.requestFocus();
    }
  }

  Future<void> _tryAutoconnect() async {
    final manager = ref.read(connectionManagerProvider);
    final prefs = await SharedPreferences.getInstance();
    final host = prefs.getString('last_server_host');
    final port = prefs.getInt('last_server_port');
    if (host != null && port != null && mounted) {
      final ok = await manager.tryReconnectLastServer();
      if (ok && mounted) {
        context.go(AppRoutes.home);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Phase 4b: on entry, try to reconnect to the last-used server once.
    if (!_attemptedAutoconnect) {
      _attemptedAutoconnect = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _tryAutoconnect();
      });
    }

    final discoveryState = ref.watch(discoveryServiceProvider);
    // Zero-friction connect: exactly one Mediarr on the LAN means no typing.
    ref.listen<DiscoveryState>(discoveryServiceProvider, (previous, next) {
      _maybeAutoConnect(next);
    });
    _maybeAutoConnect(discoveryState);
    return NetflixScaffold(
      autofocus: true,
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 32),
                  const Icon(
                    Icons.play_circle_fill,
                    color: MediarrColors.accentPrimary,
                    size: 80,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Mediarr',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _getStatusText(discoveryState),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  if (_isConnecting ||
                      discoveryState.phase == DiscoveryPhase.scanning)
                    const SizedBox(
                      width: 48,
                      height: 48,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: MediarrColors.accentPrimary,
                          strokeWidth: 3,
                        ),
                      ),
                    ),
                  if (discoveryState.servers.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Discovered servers',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    for (final server in discoveryState.servers)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: FocusableAction(
                          onSelect: () =>
                              _connectToServer(server.host, server.port),
                          borderRadius: 8,
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: MediarrColors.surfaceCard,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.dns,
                                  color: MediarrColors.accentPrimary,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        server.name,
                                        style: const TextStyle(
                                          color: MediarrColors.textPrimary,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        server.url,
                                        style: const TextStyle(
                                          color: MediarrColors.textMuted,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.arrow_forward_ios,
                                  size: 16,
                                  color: MediarrColors.textMuted,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                  const SizedBox(height: 24),
                  Text(
                    'Connect manually',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    key: const ValueKey('discovery.hostField'),
                    controller: _hostController,
                    focusNode: _hostFocusNode,
                    textInputAction: TextInputAction.next,
                    onSubmitted: _onHostSubmitted,
                    decoration: InputDecoration(
                      labelText: 'Server IP / Hostname',
                      hintText: '192.168.1.100',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: MediarrColors.surfaceCard,
                    ),
                    style: const TextStyle(color: MediarrColors.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const ValueKey('discovery.portField'),
                    controller: _portController,
                    focusNode: _portFocusNode,
                    textInputAction: TextInputAction.done,
                    keyboardType: TextInputType.number,
                    onSubmitted: _onPortSubmitted,
                    decoration: InputDecoration(
                      labelText: 'Port',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: MediarrColors.surfaceCard,
                    ),
                    style: const TextStyle(color: MediarrColors.textPrimary),
                  ),
                  const SizedBox(height: 20),
                  FocusableAction(
                    onSelect: _onConnectPressed,
                    borderRadius: 8,
                    scale: 1.03,
                    child: Container(
                      height: 56,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: MediarrColors.accentPrimary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Connect',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _getStatusText(DiscoveryState state) {
    if (_isConnecting) return 'Connecting...';
    switch (state.phase) {
      case DiscoveryPhase.scanning:
        return 'Searching for server on your network...';
      case DiscoveryPhase.found:
        return 'Found ${state.servers.length} server(s)';
      case DiscoveryPhase.timeout:
        // Still retrying in the background: say so instead of sending a remote
        // user to a text field (see _scheduleRetry).
        return state.error ?? 'No server found yet — still looking…';
      case DiscoveryPhase.manual:
        return 'Enter server address below';
      case DiscoveryPhase.connected:
        return 'Connected!';
      case DiscoveryPhase.idle:
        return 'Enter server address to connect';
    }
  }
}
