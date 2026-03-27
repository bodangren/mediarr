import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';

/// Server discovery screen shown on first launch.
///
/// Displays mDNS scanning animation and discovered servers,
/// with a manual IP:port entry fallback.
class DiscoveryScreen extends StatelessWidget {
  const DiscoveryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
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
              'Searching for server...',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 32),
            const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                color: MediarrColors.accentPrimary,
                strokeWidth: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
