// Shared D-pad focus probes for the TV navigation contract (FR-11).
//
// These helpers make focus behaviour assertable in widget tests:
//   * [focusIsInteractive] proves the focused node belongs to a control that
//     renders a focus cue. A bare `Focus` wrapper is NOT interactive, so this
//     catches the invisible focus stops found in the 2026-09-24 investigation.
//   * [focusedText] reports the text inside the focused control, which is how
//     tests say "focus is on the Movies row's first poster".
//   * [pressDpad] sends one remote key and settles the frame.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/widgets/netflix_scaffold.dart';

/// The node that owns primary focus, or null when nothing is focused.
FocusNode? primaryFocusNode() => FocusManager.instance.primaryFocus;

/// Debug label of the focused node, for readable failure messages.
String focusLabel() => primaryFocusNode()?.debugLabel ?? '(none)';

/// True when [widget] renders a visible focus cue.
bool _hasFocusCue(Widget widget) =>
    widget is FocusableAction ||
    widget is TextField ||
    widget is EditableText ||
    widget is InkWell ||
    widget is InkResponse ||
    widget is ButtonStyleButton ||
    widget is IconButton ||
    widget is ChoiceChip;

/// True when the focused node belongs to a control that renders a focus cue.
///
/// False for bare `Focus` wrappers, row anchors, and scaffold root nodes:
/// those are invisible, so a remote user cannot see where focus is.
bool focusIsInteractive() {
  final node = primaryFocusNode();
  final context = node?.context;
  if (context == null) return false;
  if (_hasFocusCue(context.widget)) return true;
  var found = false;
  context.visitAncestorElements((element) {
    if (_hasFocusCue(element.widget)) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

void _collectText(Element element, List<String> out) {
  final widget = element.widget;
  if (widget is Text) {
    final data = widget.data;
    if (data != null && data.isNotEmpty) out.add(data);
  }
  element.visitChildElements((child) => _collectText(child, out));
}

/// All text rendered under the focused node, joined with single spaces.
String focusedText() {
  final context = primaryFocusNode()?.context;
  if (context == null) return '';
  final parts = <String>[];
  _collectText(context as Element, parts);
  return parts.join(' ');
}

/// Sends one D-pad key event and settles the frame.
Future<void> pressDpad(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pumpAndSettle();
}

/// Asserts the navigation invariant: focus must sit on a visible control.
void expectVisibleFocus(String step) {
  expect(
    focusIsInteractive(),
    isTrue,
    reason: 'After "$step" focus is on "${focusLabel()}" (text: '
        '"${focusedText()}"), which renders no focus cue. A remote user '
        'cannot see where focus is.',
  );
}
