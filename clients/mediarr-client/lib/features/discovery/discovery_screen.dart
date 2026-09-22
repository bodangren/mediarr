import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/services/api_client.dart';
import 'discovery_service.dart';

/// Server discovery screen shown on first launch.
///
/// D-pad contract:
///   * Host field autofocuses on screen entry (so the on-screen TV keyboard
///     opens immediately, mirroring Netflix).
///   * Down moves focus to Port field, then to Connect.
///   * Right from the host field moves to the next field.
///   * Select on Connect triggers the connect flow.
///   * Left arrow from Port moves back to Host; from Connect moves to Port.
class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final _hostController = TextEditingController();
  final _portController = TextEditingController(text: '5174');
  final FocusNode _hostFocusNode = FocusNode(debugLabel: 'DiscoveryScreen.host');
  final FocusNode _portFocusNode = FocusNode(debugLabel: 'DiscoveryScreen.port');
  final FocusNode _connectFocusNode =
      FocusNode(debugLabel: 'DiscoveryScreen.connect');
  bool _isConnecting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(discoveryServiceProvider.notifier).startScan();
      // Autofocus the host field so the on-screen keyboard opens.
      _hostFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    _hostFocusNode.dispose();
    _portFocusNode.dispose();
    _connectFocusNode.dispose();
    super.dispose();
  }

  Future<void> _connectToServer(String host, int port) async {
    setState(() => _isConnecting = true);

    final apiClient = ref.read(apiClientProvider.notifier);
    final success = await apiClient.connect('http://$host:$port');

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
    _connectFocusNode.requestFocus();
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

  @override
  Widget build(BuildContext context) {
    final discoveryState = ref.watch(discoveryServiceProvider);
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
                  Focus(
                    focusNode: _hostFocusNode,
                    child: TextField(
                      key: const ValueKey('discovery.hostField'),
                      controller: _hostController,
                      textInputAction: TextInputAction.next,
                      onSubmitted: (value) => _onHostSubmitted(value),
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
                  ),
                  const SizedBox(height: 12),
                  Focus(
                    focusNode: _portFocusNode,
                    child: TextField(
                      key: const ValueKey('discovery.portField'),
                      controller: _portController,
                      textInputAction: TextInputAction.done,
                      keyboardType: TextInputType.number,
                      onSubmitted: (value) => _onPortSubmitted(value),
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
                  ),
                  const SizedBox(height: 20),
                  FocusableAction(
                    focusNode: _connectFocusNode,
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
        return state.error ?? 'No servers found. Try manual entry.';
      case DiscoveryPhase.manual:
        return 'Enter server address below';
      case DiscoveryPhase.connected:
        return 'Connected!';
      case DiscoveryPhase.idle:
        return 'Enter server address to connect';
    }
  }
}
