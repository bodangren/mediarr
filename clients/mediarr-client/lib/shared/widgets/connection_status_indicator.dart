import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../services/api_client.dart';

/// Small indicator showing the current server connection status.
class ConnectionStatusIndicator extends ConsumerWidget {
  const ConnectionStatusIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(apiClientProvider);

    final (color, icon, label) = switch (state.status) {
      ConnectionStatus.connected => (
          MediarrColors.statusSuccess,
          Icons.cloud_done,
          'Connected',
        ),
      ConnectionStatus.connecting => (
          MediarrColors.statusWarning,
          Icons.cloud_sync,
          'Connecting...',
        ),
      ConnectionStatus.error => (
          MediarrColors.statusError,
          Icons.cloud_off,
          'Disconnected',
        ),
      ConnectionStatus.disconnected => (
          MediarrColors.textMuted,
          Icons.cloud_off,
          'Not connected',
        ),
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(color: color, fontSize: 12),
        ),
      ],
    );
  }
}
