import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../features/playback/playback_queue.dart';
import '../../shared/services/api_client.dart';
import '../../shared/utils/async_value_ext.dart';

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
    final autoplay = ref.watch(autoplayNextEpisodeProvider).dataOrNull;

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
            // FR-3: autoplay is on by default and persisted, so a viewer can
            // turn it off and have that choice survive a restart.
            FocusableAction(
              autofocus: true,
              variant: FocusableActionVariant.button,
              borderRadius: 8,
              onSelect: () async {
                final next = !(autoplay ?? true);
                await setAutoplayNextEpisode(next);
                ref.invalidate(autoplayNextEpisodeProvider);
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                decoration: BoxDecoration(
                  color: MediarrColors.surfaceCard,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: MediarrColors.borderSubtle),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.playlist_play,
                        color: MediarrColors.textPrimary, size: 24),
                    const SizedBox(width: 10),
                    const Text(
                      'Autoplay next episode',
                      style: TextStyle(
                        color: MediarrColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      // Fail closed while the preference is still loading, so
                      // the row never claims "On" for an unknown value.
                      switch (autoplay) {
                        null => '...',
                        true => 'On',
                        false => 'Off',
                      },
                      style: const TextStyle(
                        color: MediarrColors.accentPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
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
