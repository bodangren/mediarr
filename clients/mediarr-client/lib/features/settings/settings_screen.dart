import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../features/playback/playback_queue.dart';
import '../../shared/services/api_client.dart';
import '../../shared/utils/async_value_ext.dart';

/// Build identifier shown on the Settings screen.
const String _kExplicitClientVersion =
    String.fromEnvironment('MEDIARR_CLIENT_VERSION');

/// Human-readable build identity for the settings screen.
///
/// This used to print "dev" on every release build because the dart-define it
/// read is never passed. It now falls back to the build name/number the Flutter
/// tool always provides, so support can ask "which build are you on?" and get a
/// truthful answer (device capture 2026-11-08 showed "dev" on 1.2.9).
String get kMediarrClientVersion {
  if (_kExplicitClientVersion.isNotEmpty) return _kExplicitClientVersion;
  const buildName = String.fromEnvironment('FLUTTER_BUILD_NAME');
  const buildNumber = int.fromEnvironment('FLUTTER_BUILD_NUMBER', defaultValue: 0);
  if (buildName.isNotEmpty && buildNumber > 0) return '$buildName ($buildNumber)';
  if (buildName.isNotEmpty) return buildName;
  if (buildNumber > 0) return 'build $buildNumber';
  return 'dev';
}

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
            // Dedicated-box escape hatch: opens the Android Home-app picker so
            // the TV can return to its stock launcher without ADB.
            Align(
              alignment: Alignment.centerLeft,
              child: FocusableAction(
                variant: FocusableActionVariant.button,
                borderRadius: 8,
                onSelect: () => _openSystemHomeSettings(context, ref),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: MediarrColors.surfaceCard,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: MediarrColors.borderSubtle),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.tv,
                          color: MediarrColors.textSecondary, size: 24),
                      SizedBox(width: 10),
                      Text(
                        'Android home app',
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
            const SizedBox(height: 16),
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

/// Opens Android's "Home app" picker (dedicated-box escape hatch).
///
/// When Mediarr is the launcher a viewer can still return the box to its stock
/// launcher without ADB. Failures are reported, never thrown.
Future<void> _openSystemHomeSettings(
  BuildContext context,
  WidgetRef ref,
) async {
  const channel = MethodChannel('mediarr/system');
  try {
    await channel.invokeMethod<bool>('openHomeSettings');
  } catch (error, stack) {
    unawaited(ref.read(errorReporterProvider).report(
          message: 'openHomeSettings failed: $error',
          stack: stack.toString(),
          severity: 'system',
        ));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Android settings are not available')),
    );
  }
}
