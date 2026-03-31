import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../shared/services/api_client.dart';

/// Settings screen showing connection info, server details, and app actions.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientState = ref.watch(apiClientProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Settings', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 32),

          // Connection section
          _SectionHeader(title: 'Server Connection'),
          const SizedBox(height: 12),
          Card(
            color: MediarrColors.surfaceCard,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Status row
                  _InfoRow(
                    icon: _statusIcon(clientState.status),
                    iconColor: _statusColor(clientState.status),
                    label: 'Status',
                    value: _statusLabel(clientState.status),
                  ),
                  const Divider(height: 24),
                  // Server address
                  _InfoRow(
                    icon: Icons.dns,
                    label: 'Server',
                    value: clientState.baseUrl ?? 'Not connected',
                  ),
                  if (clientState.serverVersion != null) ...[
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.info_outline,
                      label: 'Version',
                      value: clientState.serverVersion!,
                    ),
                  ],
                  if (clientState.lastError != null) ...[
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.error_outline,
                      iconColor: MediarrColors.statusError,
                      label: 'Error',
                      value: clientState.lastError!,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Actions
          Row(
            children: [
              if (clientState.status == ConnectionStatus.connected ||
                  clientState.status == ConnectionStatus.error)
                ElevatedButton.icon(
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reconnect'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: MediarrColors.accentPrimary,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () async {
                    final client = ref.read(apiClientProvider.notifier);
                    final url = clientState.baseUrl;
                    if (url != null) {
                      await client.connect(url);
                    }
                  },
                ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.logout),
                label: const Text('Disconnect'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: MediarrColors.statusError,
                  side: const BorderSide(color: MediarrColors.statusError),
                ),
                onPressed: () {
                  ref.read(apiClientProvider.notifier).disconnect();
                  context.go(AppRoutes.discovery);
                },
              ),
            ],
          ),
          const SizedBox(height: 40),

          // About section
          _SectionHeader(title: 'About'),
          const SizedBox(height: 12),
          Card(
            color: MediarrColors.surfaceCard,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  _InfoRow(
                    icon: Icons.play_circle_fill,
                    iconColor: MediarrColors.accentPrimary,
                    label: 'App',
                    value: 'Mediarr Client v1.0.0',
                  ),
                  const Divider(height: 24),
                  _InfoRow(
                    icon: Icons.devices,
                    label: 'Platform',
                    value: Theme.of(context).platform.name,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _statusIcon(ConnectionStatus status) {
    switch (status) {
      case ConnectionStatus.connected:
        return Icons.cloud_done;
      case ConnectionStatus.connecting:
        return Icons.cloud_sync;
      case ConnectionStatus.error:
        return Icons.cloud_off;
      case ConnectionStatus.disconnected:
        return Icons.cloud_off;
    }
  }

  Color _statusColor(ConnectionStatus status) {
    switch (status) {
      case ConnectionStatus.connected:
        return MediarrColors.statusSuccess;
      case ConnectionStatus.connecting:
        return MediarrColors.statusWarning;
      case ConnectionStatus.error:
        return MediarrColors.statusError;
      case ConnectionStatus.disconnected:
        return MediarrColors.textMuted;
    }
  }

  String _statusLabel(ConnectionStatus status) {
    switch (status) {
      case ConnectionStatus.connected:
        return 'Connected';
      case ConnectionStatus.connecting:
        return 'Connecting...';
      case ConnectionStatus.error:
        return 'Connection Error';
      case ConnectionStatus.disconnected:
        return 'Disconnected';
    }
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: MediarrColors.textSecondary,
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    this.iconColor,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color? iconColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: iconColor ?? MediarrColors.textMuted, size: 20),
        const SizedBox(width: 12),
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: const TextStyle(
              color: MediarrColors.textMuted,
              fontSize: 14,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
