import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../router/app_router.dart';
import '../theme/mediarr_theme.dart';
import 'netflix_scaffold.dart';

/// Direction the D-pad requested.
///
/// Mirrors [LogicalKeyboardKey] so tests can drive traversal with
/// `LogicalKeyboardKey.arrowDown/Up/Left/Right` and we map them here.
enum DpadDirection { right, left, down, up, select, back }

DpadDirection? mapLogicalKeyToDpad(LogicalKeyboardKey key) {
  if (key == LogicalKeyboardKey.arrowRight) return DpadDirection.right;
  if (key == LogicalKeyboardKey.arrowLeft) return DpadDirection.left;
  if (key == LogicalKeyboardKey.arrowDown) return DpadDirection.down;
  if (key == LogicalKeyboardKey.arrowUp) return DpadDirection.up;
  if (key == LogicalKeyboardKey.select ||
      key == LogicalKeyboardKey.enter ||
      key == LogicalKeyboardKey.space) {
    return DpadDirection.select;
  }
  if (key == LogicalKeyboardKey.escape || key == LogicalKeyboardKey.goBack) {
    return DpadDirection.back;
  }
  return null;
}

/// TV navigation destinations (owner mockup 2026-09-24): Home, Movies,
/// Series, Search, Settings. "Change server" lives on Settings, not here.
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
  _NavDestination(
    path: AppRoutes.search,
    icon: Icons.search_outlined,
    selectedIcon: Icons.search,
    label: 'Search',
  ),
  _NavDestination(
    path: AppRoutes.settings,
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings,
    label: 'Settings',
  ),
];

/// Visual for one rail destination. The focus cue comes from
/// [FocusableAction]; this widget draws the icon, the label, and the selected
/// pill (the mockup's filled accent pill marks the current destination).
class _RailTile extends StatelessWidget {
  const _RailTile({required this.destination, required this.selected});

  final _NavDestination destination;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final iconColor =
        selected ? MediarrColors.accentPrimary : MediarrColors.textSecondary;
    final labelColor =
        selected ? MediarrColors.textPrimary : MediarrColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: selected
            ? MediarrColors.accentPrimary.withValues(alpha: 0.15)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            selected ? destination.selectedIcon : destination.icon,
            color: iconColor,
            size: 32,
          ),
          const SizedBox(height: 6),
          Text(
            destination.label,
            style: TextStyle(
              color: labelColor,
              fontSize: 18,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// The main app shell: a sidebar rail plus the routed content.
///
/// D-pad contract for the shell boundary (the rail and the routed page live in
/// different focus scopes, so the framework cannot cross between them):
///   * Left moves inside the row. At the row's left edge it opens the rail and
///     focuses the current destination.
///   * Right moves inside the row. At the row's right edge it does nothing.
///   * On the rail, Up/Down walk the destinations and Right returns to the
///     content item the user came from.
class LeanbackScaffold extends StatefulWidget {
  const LeanbackScaffold({
    super.key,
    required this.currentPath,
    required this.child,
  });

  final String currentPath;
  final Widget child;

  @override
  State<LeanbackScaffold> createState() => _LeanbackScaffoldState();
}

class _LeanbackScaffoldState extends State<LeanbackScaffold> {
  late final List<FocusNode> _railNodes;
  final GlobalKey _contentKey = GlobalKey(debugLabel: 'LeanbackScaffold.content');
  FocusNode? _lastContentFocus;

  @override
  void initState() {
    super.initState();
    _railNodes = [
      for (final destination in _destinations)
        FocusNode(debugLabel: 'rail.${destination.label}'),
    ];
  }

  @override
  void dispose() {
    for (final node in _railNodes) {
      node.dispose();
    }
    super.dispose();
  }

  int get _selectedIndex {
    final index =
        _destinations.indexWhere((d) => widget.currentPath.startsWith(d.path));
    return index >= 0 ? index : 0;
  }

  bool _isInRail(FocusNode node) => _railNodes.contains(node);

  /// True when [node] has a traversal candidate in [direction] that lies
  /// entirely on that side and overlaps the node's band (the framework's
  /// in-band rule). This decides whether Left/Right move inside the row or hit
  /// the shell boundary.
  bool _hasBandCandidate(FocusNode node, TraversalDirection direction) {
    final scope = node.enclosingScope;
    if (scope == null) return false;
    final rect = node.rect;
    for (final candidate in scope.traversalDescendants) {
      if (identical(candidate, node)) continue;
      if (!candidate.canRequestFocus || candidate.skipTraversal) continue;
      final other = candidate.rect;
      final overlapsBand = other.top < rect.bottom && other.bottom > rect.top;
      if (!overlapsBand) continue;
      if (direction == TraversalDirection.left && other.right <= rect.left) {
        return true;
      }
      if (direction == TraversalDirection.right && other.left >= rect.right) {
        return true;
      }
    }
    return false;
  }

  void _openRail(FocusNode current) {
    _lastContentFocus = current;
    _railNodes[_selectedIndex.clamp(0, _railNodes.length - 1)].requestFocus();
  }

  void _closeRail() {
    final back = _lastContentFocus;
    if (back != null && back.context != null && back.canRequestFocus) {
      back.requestFocus();
      return;
    }
    final contentContext = _contentKey.currentContext;
    if (contentContext == null) return;
    for (final node in FocusScope.of(contentContext).traversalDescendants) {
      if (node.canRequestFocus && !node.skipTraversal) {
        node.requestFocus();
        return;
      }
    }
  }

  KeyEventResult _handleShellKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final direction = mapLogicalKeyToDpad(event.logicalKey);
    final primary = FocusManager.instance.primaryFocus;
    if (primary == null || direction == null) return KeyEventResult.ignored;

    final inRail = _isInRail(primary);
    if (!inRail) {
      _lastContentFocus = primary;
    }

    switch (direction) {
      case DpadDirection.left:
        if (inRail) return KeyEventResult.handled;
        if (_hasBandCandidate(primary, TraversalDirection.left)) {
          return KeyEventResult.ignored;
        }
        _openRail(primary);
        return KeyEventResult.handled;
      case DpadDirection.right:
        if (inRail) {
          _closeRail();
          return KeyEventResult.handled;
        }
        if (_hasBandCandidate(primary, TraversalDirection.right)) {
          return KeyEventResult.ignored;
        }
        return KeyEventResult.handled;
      default:
        return KeyEventResult.ignored;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Focus(
        onKeyEvent: _handleShellKey,
        child: FocusTraversalGroup(
          policy: OrderedTraversalPolicy(),
          child: Row(
            children: [
              Container(
                color: MediarrColors.surfaceCard,
                width: 160,
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  children: [
                    for (var i = 0; i < _destinations.length; i++)
                      FocusableAction(
                        focusNode: _railNodes[i],
                        onSelect: () => context.go(_destinations[i].path),
                        variant: FocusableActionVariant.button,
                        borderRadius: 12,
                        focusPadding: 4,
                        child: _RailTile(
                          destination: _destinations[i],
                          selected: i == _selectedIndex,
                        ),
                      ),
                  ],
                ),
              ),
              const VerticalDivider(thickness: 1, width: 1),
              Expanded(
                key: _contentKey,
                child: widget.child,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
