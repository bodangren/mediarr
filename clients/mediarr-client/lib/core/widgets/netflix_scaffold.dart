import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/mediarr_theme.dart';

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

/// Netflix-style focusable surface. Wraps [child] in a
/// [FocusTraversalGroup] so descendants can be reached with D-pad keys.
///
/// The scaffold:
///   * Autofocuses the first [FocusableAction] in the tree on mount.
///   * Handles arrow keys / select / back at the top of the tree when the
///     focused element is itself the scaffold (no inner [FocusableAction] has
///     focus), so an empty D-pad scroll request still bubbles up.
class NetflixScaffold extends StatefulWidget {
  const NetflixScaffold({
    super.key,
    required this.child,
    this.autofocus = true,
    this.onBack,
  });

  final Widget child;
  final bool autofocus;

  /// Optional back handler (e.g. for a tab navigator's parent).
  /// Called when no inner FocusableAction has focus and the user presses
  /// Back. If null, the Back key is left for the navigator to consume.
  final VoidCallback? onBack;

  @override
  State<NetflixScaffold> createState() => _NetflixScaffoldState();
}

class _NetflixScaffoldState extends State<NetflixScaffold> {
  late final FocusNode _rootFocusNode;

  @override
  void initState() {
    super.initState();
    _rootFocusNode = FocusNode(debugLabel: 'NetflixScaffold.root');
    // We do NOT autofocus the root node. The point of NetflixScaffold is to
    // host a FocusTraversalGroup; the first descendant FocusableAction or
    // focused TextField on each screen owns the initial focus. Stealing it
    // would defeat the on-screen TV keyboard pattern on DiscoveryScreen
    // (the host field must autofocus so the keyboard opens immediately).
  }

  @override
  void dispose() {
    _rootFocusNode.dispose();
    super.dispose();
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final direction = mapLogicalKeyToDpad(event.logicalKey);
    if (direction == null) return KeyEventResult.ignored;
    if (direction == DpadDirection.back) {
      widget.onBack?.call();
      // Never claim Back — let the navigator consume it.
      return KeyEventResult.ignored;
    }
    // Arrow keys and select on the scaffold root are no-ops; the inner
    // FocusTraversalGroup inside [child] handles them. We only exist to
    // hold a focus anchor for autofocus + a fallback back handler.
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _rootFocusNode,
      onKeyEvent: _handleKeyEvent,
      child: FocusTraversalGroup(
        policy: OrderedTraversalPolicy(),
        child: Material(
          type: MaterialType.transparency,
          child: widget.child,
        ),
      ),
    );
  }
}

/// A focusable, D-pad-activatable widget.
///
/// On focus:
///   * Border turns into the accent ring (Netflix-style focus zoom).
///   * Scale animation lifts the card visibly.
/// On select / Enter / Space:
///   * Invokes [onSelect].
class FocusableAction extends StatefulWidget {
  const FocusableAction({
    super.key,
    required this.child,
    this.autofocus = false,
    this.focusNode,
    this.onSelect,
    this.onFocusChange,
    this.scale = 1.06,
    this.borderRadius = 8,
  });

  final Widget child;
  final bool autofocus;
  final FocusNode? focusNode;
  final VoidCallback? onSelect;
  final ValueChanged<bool>? onFocusChange;
  final double scale;
  final double borderRadius;

  @override
  State<FocusableAction> createState() => _FocusableActionState();
}

class _FocusableActionState extends State<FocusableAction> {
  late final FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode(debugLabel: 'FocusableAction');
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  void _onFocusChange() {
    final has = _focusNode.hasFocus;
    if (has != _isFocused) {
      setState(() => _isFocused = has);
      widget.onFocusChange?.call(has);
    }
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final direction = mapLogicalKeyToDpad(event.logicalKey);
    if (direction == DpadDirection.select) {
      widget.onSelect?.call();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focusNode,
      autofocus: widget.autofocus,
      onKeyEvent: _handleKeyEvent,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onSelect,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          transform: _isFocused
              ? (Matrix4.identity()..scaleByDouble(
                  widget.scale,
                  widget.scale,
                  1.0,
                  1.0,
                ))
              : Matrix4.identity(),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: _isFocused
                  ? MediarrColors.focusRing
                  : Colors.transparent,
              width: _isFocused ? 3 : 0,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color:
                          MediarrColors.focusRing.withValues(alpha: 0.45),
                      blurRadius: 18,
                      spreadRadius: 2,
                    ),
                  ]
                : const [],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(widget.borderRadius - 2),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
