import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../router/app_router.dart';
import '../theme/mediarr_theme.dart';

/// Navigation destinations for the leanback sidebar.
class _NavDestination {
  const _NavDestination({
    required this.path,
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

const _destinations = [
  _NavDestination(
    path: AppRoutes.movies,
    icon: Icons.movie_outlined,
    selectedIcon: Icons.movie,
    label: 'Movies',
  ),
  _NavDestination(
    path: AppRoutes.series,
    icon: Icons.tv_outlined,
    selectedIcon: Icons.tv,
    label: 'Series',
  ),
  _NavDestination(
    path: AppRoutes.settings,
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings,
    label: 'Settings',
  ),
];

/// The main app shell with a sidebar navigation rail for the 10-foot UI.
///
/// Uses [NavigationRail] for a vertical sidebar that works well with
/// D-pad navigation on Android TV and keyboard navigation on desktop.
class LeanbackScaffold extends StatelessWidget {
  const LeanbackScaffold({
    super.key,
    required this.currentPath,
    required this.child,
  });

  final String currentPath;
  final Widget child;

  int get _selectedIndex {
    final index = _destinations.indexWhere((d) => currentPath.startsWith(d.path));
    return index >= 0 ? index : 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          // Sidebar navigation
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              context.go(_destinations[index].path);
            },
            labelType: NavigationRailLabelType.all,
            leading: Padding(
              padding: const EdgeInsets.only(bottom: 16, top: 16),
              child: Column(
                children: [
                  Icon(
                    Icons.play_circle_fill,
                    color: MediarrColors.accentPrimary,
                    size: 36,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Mediarr',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: MediarrColors.accentPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
            destinations: _destinations.map((d) {
              return NavigationRailDestination(
                icon: Icon(d.icon),
                selectedIcon: Icon(d.selectedIcon),
                label: Text(d.label),
              );
            }).toList(),
          ),
          // Divider
          const VerticalDivider(thickness: 1, width: 1),
          // Content area
          Expanded(child: child),
        ],
      ),
    );
  }
}
