import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mediarr_client/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App smoke test', () {
    testWidgets('app starts and shows discovery screen', (tester) async {
      app.main();
      await tester.pump();
      await tester.pump();

      // Discovery screen should be visible
      expect(find.text('Mediarr'), findsOneWidget);
    });

    testWidgets('manual entry form is usable', (tester) async {
      app.main();
      await tester.pump();
      await tester.pump();

      // Should find the IP/port text fields for manual entry
      final textFields = find.byType(TextField);
      expect(textFields, findsWidgets);
    });
  });
}
