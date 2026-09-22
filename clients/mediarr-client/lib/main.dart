import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import 'core/router/app_router.dart';
import 'core/theme/mediarr_theme.dart';
import 'features/discovery/bonsoir_adapter.dart';
import 'features/discovery/discovery_service.dart';
import 'shared/providers/connection_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  runApp(ProviderScope(
    overrides: [
      discoveryServiceProvider.overrideWith((ref) {
        return DiscoveryService(
          mdnsAdapter: BonsoirMdnsAdapter(),
          scanTimeoutDuration: const Duration(seconds: 10),
        );
      }),
    ],
    child: MediarrApp(),
  ));
}

class MediarrApp extends ConsumerStatefulWidget {
  const MediarrApp({super.key});

  @override
  ConsumerState<MediarrApp> createState() => _MediarrAppState();
}

class _MediarrAppState extends ConsumerState<MediarrApp> {
  bool _attemptedAutoconnect = false;

  @override
  void initState() {
    super.initState();
    // Phase 4b: on cold boot, try to reconnect to the last-used server before
    // the first frame paints. If it succeeds, the router's redirect will
    // route to Home; if it fails (no prefs or server down), the user lands
    // on Discovery.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (_attemptedAutoconnect) return;
      _attemptedAutoconnect = true;
      final manager = ref.read(connectionManagerProvider);
      await manager.tryReconnectLastServer();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Mediarr',
      debugShowCheckedModeBanner: false,
      theme: mediarrDarkTheme,
      routerConfig: router,
    );
  }
}
