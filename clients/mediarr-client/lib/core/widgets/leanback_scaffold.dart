import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../router/app_router.dart';
import '../theme/mediarr_theme.dart';

/// TV navigation destinations (Phase 4b: stripped to Home/Movies/Series).
///
/// Slim mode disables Activity/Calendar/Search/Settings server routes, so
/// those items must not appear in the TV UI. Only the browse surfaces stay.
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
    path: AppRoutes.home,
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    label: 'Home',
  ),
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
];

/// The main app shell with a sidebar navigation rail for the 10-foot UI.
///
/// Phase 4b: only Home / Movies / Series. The leanback_scaffold is wrapped
/// in a FocusTraversalGroup so the rail + content area form one
/// keyboard-navigable surface.
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
      body: FocusTraversalGroup(
        policy: OrderedTraversalPolicy(),
        child: Row(
          children: [
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
            const VerticalDivider(thickness: 1, width: 1),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}
