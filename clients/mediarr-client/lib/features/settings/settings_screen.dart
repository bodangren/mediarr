import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/services/api_client.dart';

/// Build identifier shown on the Settings screen.
const String kMediarrClientVersion =
    String.fromEnvironment('MEDIARR_CLIENT_VERSION', defaultValue: 'dev');

/// Minimal settings surface (owner mockup 2026-09-24, FR-6).
///
/// Shows the connected server, a `Change server` action that routes to
/// Discovery (`?switch=1`), and the client build version. The old rail
/// `Server` affordance moved here.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientState = ref.watch(apiClientProvider);
    final server = clientState.baseUrl ?? 'Not connected';

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'Settings',
              style: TextStyle(
                color: MediarrColors.textPrimary,
                fontSize: 28,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 24),
            _SettingsRow(
              label: 'Server',
              value: server,
            ),
            const SizedBox(height: 12),
            _SettingsRow(
              label: 'Client build',
              value: kMediarrClientVersion,
            ),
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.centerLeft,
              child: FocusableAction(
                autofocus: true,
                variant: FocusableActionVariant.button,
                borderRadius: 8,
                onSelect: () => context.go('${AppRoutes.discovery}?switch=1'),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: MediarrColors.surfaceCard,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: MediarrColors.borderSubtle),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.dns_outlined,
                          color: MediarrColors.textPrimary, size: 24),
                      SizedBox(width: 10),
                      Text(
                        'Change server',
                        style: TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 200,
          child: Text(
            label,
            style: const TextStyle(
              color: MediarrColors.textSecondary,
              fontSize: 18,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
