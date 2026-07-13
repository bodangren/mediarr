import 'package:flutter/material.dart';

import '../theme/mediarr_theme.dart';

/// A card widget with visible focus ring for D-pad / keyboard navigation.
///
/// When focused, displays a glowing border ring using the accent primary color.
/// When pressed, triggers [onPressed].
class FocusableCard extends StatefulWidget {
  const FocusableCard({
    super.key,
    required this.child,
    this.onPressed,
    this.autofocus = false,
    this.width,
    this.height,
    this.focusNode,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final bool autofocus;
  final double? width;
  final double? height;
  final FocusNode? focusNode;

  @override
  State<FocusableCard> createState() => _FocusableCardState();
}

class _FocusableCardState extends State<FocusableCard> {
  late final FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  void _handleFocusChange(bool hasFocus) {
    setState(() => _isFocused = hasFocus);
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focusNode,
      autofocus: widget.autofocus,
      onFocusChange: _handleFocusChange,
      onKeyEvent: (node, event) {
        // Let the system handle key events — we just track focus state
        return KeyEventResult.ignored;
      },
      child: GestureDetector(
        onTap: widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          width: widget.width,
          height: widget.height,
          transform: _isFocused
              ? (Matrix4.identity()..scaleByDouble(1.05, 1.05, 1.0, 1.0))
              : Matrix4.identity(),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            color: MediarrColors.surfaceCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _isFocused
                  ? MediarrColors.focusRing
                  : MediarrColors.borderSubtle,
              width: _isFocused ? 2.0 : 1.0,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: MediarrColors.focusRing.withValues(alpha: 0.3),
                      blurRadius: 12,
                      spreadRadius: 2,
                    ),
                  ]
                : [],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(11),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
