import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/focusable_card.dart';
import '../../shared/services/api_client.dart';
import 'discovery_service.dart';

/// Server discovery screen shown on first launch.
class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final _hostController = TextEditingController();
  final _portController = TextEditingController(text: '5174');
  bool _isConnecting = false;

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    super.dispose();
  }

  Future<void> _connectToServer(String host, int port) async {
    setState(() => _isConnecting = true);

    final apiClient = ref.read(apiClientProvider.notifier);
    final success = await apiClient.connect('http://$host:$port');

    if (!mounted) return;

    if (success) {
      context.go(AppRoutes.movies);
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

  @override
  Widget build(BuildContext context) {
    // Watch discovery state if the provider is overridden
    DiscoveryState? discoveryState;
    try {
      discoveryState = ref.watch(discoveryServiceProvider);
    } catch (_) {
      // Provider not overridden — show manual-only mode
    }

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Branding
              const Icon(
                Icons.play_circle_fill,
                color: MediarrColors.accentPrimary,
                size: 80,
              ),
              const SizedBox(height: 24),
              Text(
                'Mediarr',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(
                _getStatusText(discoveryState),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),

              // Scanning indicator
              if (_isConnecting ||
                  discoveryState?.phase == DiscoveryPhase.scanning)
                const SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    color: MediarrColors.accentPrimary,
                    strokeWidth: 3,
                  ),
                ),

              // Discovered servers list
              if (discoveryState != null &&
                  discoveryState.servers.isNotEmpty) ...[
                const SizedBox(height: 24),
                ...discoveryState.servers.map((server) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FocusableCard(
                        onPressed: () =>
                            _connectToServer(server.host, server.port),
                        child: ListTile(
                          leading: const Icon(Icons.dns,
                              color: MediarrColors.accentPrimary),
                          title: Text(server.name),
                          subtitle: Text(server.url),
                          trailing: const Icon(Icons.arrow_forward_ios,
                              size: 16),
                        ),
                      ),
                    )),
              ],

              // Manual entry
              const SizedBox(height: 32),
              Text(
                'Connect manually',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: _hostController,
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
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: TextField(
                      controller: _portController,
                      decoration: InputDecoration(
                        labelText: 'Port',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        filled: true,
                        fillColor: MediarrColors.surfaceCard,
                      ),
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: MediarrColors.textPrimary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isConnecting
                      ? null
                      : () {
                          final host = _hostController.text.trim();
                          final port =
                              int.tryParse(_portController.text.trim()) ?? 5174;
                          if (host.isNotEmpty) {
                            _connectToServer(host, port);
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: MediarrColors.accentPrimary,
                    foregroundColor: MediarrColors.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Connect'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getStatusText(DiscoveryState? state) {
    if (_isConnecting) return 'Connecting...';
    if (state == null) return 'Enter server address to connect';
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
