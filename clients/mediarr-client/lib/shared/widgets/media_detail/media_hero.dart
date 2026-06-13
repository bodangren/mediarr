import 'package:flutter/material.dart';

import '../../../core/theme/mediarr_theme.dart';

class MediaHeroAction {
  const MediaHeroAction({
    required this.label,
    required this.icon,
    this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
}

class MediaHero extends StatelessWidget {
  const MediaHero({
    super.key,
    this.backdropUrl,
    this.posterUrl,
    required this.title,
    this.subtitle,
    this.actions = const [],
  });

  final String? backdropUrl;
  final String? posterUrl;
  final String title;
  final String? subtitle;
  final List<MediaHeroAction> actions;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Backdrop / poster area
        if (backdropUrl != null)
          SizedBox(
            width: double.infinity,
            height: 200,
            child: Image.network(
              backdropUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const _HeroPlaceholder(),
            ),
          )
        else if (posterUrl != null)
          SizedBox(
            width: double.infinity,
            height: 200,
            child: Image.network(
              posterUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const _HeroPlaceholder(),
            ),
          )
        else
          const _HeroPlaceholder(),
        // Title and subtitle
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
        if (subtitle != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              subtitle!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        // Action buttons
        if (actions.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Wrap(
              spacing: 8,
              children: [
                for (final action in actions)
                  TextButton.icon(
                    onPressed: action.onPressed,
                    icon: Icon(action.icon),
                    label: Text(action.label),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _HeroPlaceholder extends StatelessWidget {
  const _HeroPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 200,
      color: MediarrColors.surfaceElevated,
      child: const Center(
        child: Icon(
          Icons.movie,
          color: MediarrColors.textMuted,
          size: 48,
        ),
      ),
    );
  }
}
