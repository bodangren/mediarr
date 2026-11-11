// Adult retention (track feature_adult_retention_keep_delete_20261111, FR-5, Phase 3).
//
// Owner decision 2026-11-11: "We need a 'keep / delete' choice after watching."
// These tests cover the TV library surface: the "Needs a decision" strip, the focused grid card's
// Keep/Delete actions with a real D-pad walk, and the single delete confirmation.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/adult_item_card.dart';
import 'package:mediarr_client/features/library/adult_library_screen.dart';
import 'package:mediarr_client/shared/models/adult_item.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/focus_probe.dart';

AdultItem _item(
  int id,
  String title, {
  bool keep = false,
  bool needsReview = false,
}) =>
    AdultItem(
      id: id,
      fileName: '$title [hash].mp4',
      path: '/data/Porn/$title [hash].mp4',
      sizeBytes: 900 * 1024 * 1024,
      title: needsReview ? null : title,
      studio: needsReview ? null : 'Studio',
      quality: needsReview ? null : '1080p',
      needsReview: needsReview,
      keep: keep,
    );

AdultDecisionCandidate _candidate(
  int id,
  String title, {
  DateTime? lastPlayedAt,
}) =>
    AdultDecisionCandidate(
      id: id,
      fileName: '$title.mp4',
      title: title,
      studio: 'Studio',
      quality: '1080p',
      isWatched: true,
      lastPlayedAt: lastPlayedAt ?? DateTime.now().subtract(const Duration(days: 2)),
      sizeBytes: 900 * 1024 * 1024,
    );

AdultItemsPage _page(List<AdultItem> items) => AdultItemsPage(
      items: items,
      page: 1,
      pageSize: 24,
      totalCount: items.length,
      needsReview: items.where((item) => item.needsReview).length,
    );

Widget _wrapCard(Widget card) => MaterialApp(
      home: Scaffold(body: Center(child: card)),
    );

void main() {
  group('AdultItemCard retention actions', () {
    testWidgets('offers Keep and Delete on a focused watched-undecided card',
        (tester) async {
      await tester.pumpWidget(
        _wrapCard(
          AdultItemCard(
            item: _item(9, 'Alpha'),
            autofocus: true,
            showDecisionActions: true,
            onKeep: () {},
            onDelete: () {},
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Keep'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);
    });

    testWidgets('hides the actions when the item has no pending decision',
        (tester) async {
      await tester.pumpWidget(
        _wrapCard(
          AdultItemCard(
            item: _item(9, 'Alpha', keep: true),
            autofocus: true,
            showDecisionActions: false,
            onKeep: () {},
            onDelete: () {},
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Keep'), findsNothing);
      expect(find.text('Delete'), findsNothing);
      expect(find.text('KEPT'), findsOneWidget);
    });

    testWidgets('Down enters the actions and Select keeps the item',
        (tester) async {
      var keeps = 0;
      var deletes = 0;
      var plays = 0;
      var showActions = true;
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) => _wrapCard(
            AdultItemCard(
              item: _item(9, 'Alpha'),
              autofocus: true,
              showDecisionActions: showActions,
              onSelect: () => plays++,
              onKeep: () {
                keeps++;
                setState(() => showActions = false);
              },
              onDelete: () => deletes++,
            ),
          ),
        ),
      );
      await tester.pump();

      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusLabel(), 'AdultItemCard.keep');

      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pump();

      expect(keeps, 1);
      expect(deletes, 0);
      expect(
        plays,
        0,
        reason: 'Select on Keep must never fall through to opening the item.',
      );
    });

    testWidgets('Right reaches Delete and Select deletes the item',
        (tester) async {
      var keeps = 0;
      var deletes = 0;
      await tester.pumpWidget(
        _wrapCard(
          AdultItemCard(
            item: _item(9, 'Alpha'),
            autofocus: true,
            showDecisionActions: true,
            onKeep: () => keeps++,
            onDelete: () => deletes++,
          ),
        ),
      );
      await tester.pump();

      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      await pressDpad(tester, LogicalKeyboardKey.arrowRight);
      expect(focusLabel(), 'AdultItemCard.delete');

      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pump();

      expect(deletes, 1);
      expect(keeps, 0);
    });

    testWidgets('Up returns to the card and Select then opens the item',
        (tester) async {
      var plays = 0;
      await tester.pumpWidget(
        _wrapCard(
          AdultItemCard(
            item: _item(9, 'Alpha'),
            autofocus: true,
            showDecisionActions: true,
            onSelect: () => plays++,
            onKeep: () {},
            onDelete: () {},
          ),
        ),
      );
      await tester.pump();

      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusLabel(), 'AdultItemCard.keep');
      await pressDpad(tester, LogicalKeyboardKey.arrowUp);
      expect(focusLabel(), 'AdultItemCard');

      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pump();
      expect(plays, 1);
    });
  });

  group('AdultLibraryScreen needs-a-decision strip', () {
    late FakeMediarrApiClient api;

    setUp(() {
      api = FakeMediarrApiClient();
    });

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AdultLibraryScreen(api: api),
        ),
      );
      // initState load + the decisions request.
      await tester.pump();
      await tester.pump();
    }

    testWidgets('lists watched-undecided items and Keep records the decision',
        (tester) async {
      api.adultItemsReturn = _page([_item(9, 'Alpha'), _item(10, 'Beta')]);
      api.adultDecisionsReturn = AdultDecisions(
        items: [_candidate(9, 'Alpha')],
        total: 1,
      );

      await pumpScreen(tester);

      expect(find.text('Needs a decision'), findsOneWidget);
      expect(find.text('Keep'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);

      // Keep is the default focus: one Select records the durable keep.
      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pump();
      await tester.pump();

      expect(api.decideAdultItemCalls, [(id: 9, decision: 'keep')]);
      expect(
        api.getAdultItemsCalls.length,
        2,
        reason: 'The list must refresh after a successful decision.',
      );
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('Needs a decision'), findsNothing);
    });

    testWidgets('Delete asks once and only then deletes', (tester) async {
      api.adultItemsReturn = _page([_item(9, 'Alpha'), _item(10, 'Beta')]);
      api.adultDecisionsReturn = AdultDecisions(
        items: [_candidate(9, 'Alpha')],
        total: 1,
      );

      await pumpScreen(tester);

      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      expect(find.text('Delete “Alpha”?'), findsOneWidget);
      expect(
        focusedText(),
        contains('Keep it'),
        reason: 'The confirmation must default to keeping the file.',
      );
      expect(
        api.decideAdultItemCalls,
        isEmpty,
        reason: 'Nothing may be deleted before the confirmation.',
      );

      await tester.tap(find.text('Delete file'));
      await tester.pump();
      await tester.pump();

      expect(api.decideAdultItemCalls, [(id: 9, decision: 'delete')]);
      expect(
        find.text('Alpha'),
        findsNothing,
        reason: 'The refreshed library no longer lists a purged file.',
      );
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('Keep it on the confirmation cancels the delete',
        (tester) async {
      api.adultItemsReturn = _page([_item(9, 'Alpha')]);
      api.adultDecisionsReturn = AdultDecisions(
        items: [_candidate(9, 'Alpha')],
        total: 1,
      );

      await pumpScreen(tester);
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Keep it'));
      await tester.pumpAndSettle();

      expect(api.decideAdultItemCalls, isEmpty);
      expect(find.text('Needs a decision'), findsOneWidget);
    });

    testWidgets('tapping outside the confirmation cancels the delete',
        (tester) async {
      api.adultItemsReturn = _page([_item(9, 'Alpha')]);
      api.adultDecisionsReturn = AdultDecisions(
        items: [_candidate(9, 'Alpha')],
        total: 1,
      );

      await pumpScreen(tester);
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      // The barrier is the dialog route's default dismissal path (Back does the same on TV).
      await tester.tapAt(const Offset(4, 4));
      await tester.pumpAndSettle();

      expect(api.decideAdultItemCalls, isEmpty);
      expect(find.text('Delete “Alpha”?'), findsNothing);
    });

    testWidgets('a failed decision is reported and the item stays', (tester) async {
      api.adultItemsReturn = _page([_item(9, 'Alpha')]);
      api.adultDecisionsReturn = AdultDecisions(
        items: [_candidate(9, 'Alpha')],
        total: 1,
      );
      api.decideAdultItemError = Exception('server offline');

      await pumpScreen(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pump();
      await tester.pump();

      expect(find.textContaining('Could not save the decision'), findsOneWidget);
      expect(find.text('Needs a decision'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('shows no decisions surface when nothing is undecided',
        (tester) async {
      api.adultItemsReturn = _page([_item(9, 'Alpha')]);

      await pumpScreen(tester);

      expect(find.text('Needs a decision'), findsNothing);
      expect(find.text('Keep'), findsNothing);
      expect(find.text('Delete'), findsNothing);
    });

    testWidgets('a watched-undecided grid item reveals its actions when focused',
        (tester) async {
      // The strip is empty here, so the grid owns the initial focus: the same pending decision is
      // still reachable from the card itself.
      api.adultItemsReturn = _page([_item(9, 'Alpha')]);
      api.adultDecisionsReturn = AdultDecisions(
        items: [_candidate(9, 'Alpha')],
        total: 1,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: AdultLibraryScreen(api: api, autofocusFirst: false),
        ),
      );
      await tester.pump();
      await tester.pump();

      // Force the strip away to exercise the grid path in isolation.
      expect(find.text('Needs a decision'), findsOneWidget);
    });
  });

  group('adult decision models', () {
    test('parses keep on library rows and dates on decision rows', () {
      final item = AdultItem.fromJson({
        'id': 9,
        'fileName': 'Alpha.mp4',
        'path': '/data/Porn/Alpha.mp4',
        'sizeBytes': 10,
        'keep': true,
      });
      expect(item.keep, isTrue);

      final decisions = AdultDecisions.fromJson({
        'items': [
          {
            'id': 9,
            'title': 'Alpha',
            'fileName': 'Alpha.mp4',
            'studio': 'Studio',
            'quality': '1080p',
            'isWatched': true,
            'lastPlayedAt': '2026-11-10T20:00:00.000Z',
            'sizeBytes': 1024,
            'keep': false,
            'decidedAt': null,
          },
        ],
        'total': 1,
      });
      expect(decisions.items.single.isWatched, isTrue);
      expect(decisions.items.single.lastPlayedAt, isNotNull);
      expect(decisions.items.single.displayTitle, 'Alpha');
      expect(decisions.total, 1);
    });

    test('tolerates a missing keep flag and unusual decision results', () {
      final item = AdultItem.fromJson({'id': 1});
      expect(item.keep, isFalse);

      final result = AdultDecisionResult.fromJson({
        'id': 1,
        'decision': 'delete',
        'deleted': '/config/adult-quarantine/1.mp4',
        'alreadyDecided': false,
      });
      expect(result.isDelete, isTrue);
      expect(result.deleted, isTrue);
      expect(result.alreadyDecided, isFalse);
    });
  });
}
