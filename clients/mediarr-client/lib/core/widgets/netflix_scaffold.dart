import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show RenderAbstractViewport;
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
      // The root is a key-event anchor and nothing else. It must never be a
      // traversal stop: it renders no focus cue, so it used to swallow the
      // Left press and then block Down (F3 in tv-ux-investigation-20260924).
      canRequestFocus: false,
      skipTraversal: true,
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

/// Variant for the focus cue. Default is the poster-style (bright accent
/// ring + scale-up + glow); [button] is for compact focusable controls
/// (text turns white, a bright accent underline appears).
enum FocusableActionVariant { poster, button }

/// A focusable, D-pad-activatable widget with a single, unmistakable focus cue.
///
/// On focus:
///   * The child grows into the focus padding (Netflix-style "pop"), so the
///     slot keeps its layout size: neighbours never move and the ring is never
///     clipped at a list edge.
///   * A 3 px white ring plus an accent glow surround the element.
///   * The widget reveals itself in every enclosing [Scrollable], so the cue
///     cannot move out of sight (F4).
///
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
    this.scale = 1.0,
    this.borderRadius = 8,
    this.variant = FocusableActionVariant.poster,
    this.focusPadding,
    this.debugLabel,
  });

  final Widget child;
  final bool autofocus;
  final FocusNode? focusNode;
  final VoidCallback? onSelect;
  final ValueChanged<bool>? onFocusChange;

  /// Kept for call-site compatibility. The focus "pop" now comes from the
  /// child growing into [focusPadding], not from a transform.
  final double scale;
  final double borderRadius;
  final FocusableActionVariant variant;

  /// Layout space reserved around the child at all times. The child grows into
  /// it when focused. Defaults to 10 (poster) or 4 (button).
  final double? focusPadding;

  /// Label for the focus node, used by the D-pad navigation tests.
  final String? debugLabel;

  @override
  State<FocusableAction> createState() => _FocusableActionState();
}

class _FocusableActionState extends State<FocusableAction> {
  late final FocusNode _focusNode;
  bool _isFocused = false;

  double get _focusPadding =>
      widget.focusPadding ??
      (widget.variant == FocusableActionVariant.poster ? 10 : 4);

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ??
        FocusNode(debugLabel: widget.debugLabel ?? 'FocusableAction');
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
      if (has) {
        _revealInScrollables();
      }
    }
  }

  /// Scrolls every enclosing scrollable just enough to show this widget.
  ///
  /// The policy is chosen per direction, and this is load-bearing:
  /// `ScrollPosition.ensureVisible` implements `keepVisibleAtStart` as
  /// "scroll up only" (`if (target > pixels) target = pixels`) and
  /// `keepVisibleAtEnd` as "scroll down only". A single fixed policy can
  /// therefore never reveal a control on the other side of the fold, which is
  /// exactly the device-reported defect where pressing Down through a season's
  /// episodes left the selection off the bottom of the screen while the
  /// `SingleChildScrollView` stayed at offset 0. Measured 2026-10-03 on the
  /// X96Max box and in `episode_scroll_test.dart`.
  void _revealInScrollables() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_isFocused) return;
      final target = context.findRenderObject();
      if (target is! RenderBox || !target.attached) return;
      final viewport = RenderAbstractViewport.maybeOf(target);
      if (viewport == null) return;
      final scrollable = Scrollable.maybeOf(context);
      final position = scrollable?.position;
      if (position == null) return;

      final double alignStart =
          viewport.getOffsetToReveal(target, 0.0, axis: position.axis).offset;
      final double alignEnd =
          viewport.getOffsetToReveal(target, 1.0, axis: position.axis).offset;
      final double pixels = position.pixels;

      final ScrollPositionAlignmentPolicy policy;
      if (alignStart < pixels) {
        policy = ScrollPositionAlignmentPolicy.keepVisibleAtStart;
      } else if (alignEnd > pixels) {
        policy = ScrollPositionAlignmentPolicy.keepVisibleAtEnd;
      } else {
        return; // Fully visible; no scroll, so entry focus never causes a jump.
      }

      unawaited(Scrollable.ensureVisible(
        context,
        alignmentPolicy: policy,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      ));
    });
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
    final isPoster = widget.variant == FocusableActionVariant.poster;
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
          // The child grows into reserved padding when focused. Layout size is
          // constant, so the ring is never clipped and neighbours never move.
          padding: EdgeInsets.all(_isFocused ? 0 : _focusPadding),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius + 2),
            border: Border.all(
              color: _isFocused ? Colors.white : Colors.transparent,
              width: _isFocused ? (isPoster ? 3 : 2) : 0,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: MediarrColors.focusRing.withValues(alpha: 0.7),
                      blurRadius: isPoster ? 18 : 12,
                      spreadRadius: isPoster ? 3 : 1,
                    ),
                  ]
                : const [],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}