import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import 'core/router/app_router.dart';
import 'core/theme/mediarr_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  runApp(const ProviderScope(child: MediarrApp()));
}

class MediarrApp extends ConsumerWidget {
  const MediarrApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Mediarr',
      debugShowCheckedModeBanner: false,
      theme: mediarrDarkTheme,
      routerConfig: router,
    );
  }
}
