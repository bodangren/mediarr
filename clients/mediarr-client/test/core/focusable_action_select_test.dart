import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/widgets/netflix_scaffold.dart';

/// Device defect 2026-11-09: every OK press fired onSelect twice (key-down + key-up), which pushed two
/// playback routes and made episode resume flaky. These tests pin the corrected contract: one select per
/// press, and a held press opens the context menu instead of selecting.
void main() {
  testWidgets('a short press selects exactly once', (tester) async {
    var selects = 0;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Center(
          child: FocusableAction(
            autofocus: true,
            onSelect: () => selects += 1,
            child: const SizedBox(width: 200, height: 80),
          ),
        ),
      ),
    ));
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    expect(selects, 1, reason: 'One press must deliver exactly one select.');
  });

  testWidgets('holding select opens the context menu and does not also select', (tester) async {
    var selects = 0;
    var menus = 0;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Center(
          child: FocusableAction(
            autofocus: true,
            onSelect: () => selects += 1,
            onContextMenu: () => menus += 1,
            child: const SizedBox(width: 200, height: 80),
          ),
        ),
      ),
    ));
    await tester.pump();
    await tester.sendKeyDownEvent(LogicalKeyboardKey.select);
    await tester.pump(const Duration(milliseconds: 800));
    await tester.sendKeyUpEvent(LogicalKeyboardKey.select);
    await tester.pump();
    expect(menus, 1);
    expect(selects, 0, reason: 'A long press opens the menu and must not also select.');
  });
}
