import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/widgets/connection_status_indicator.dart';

void main() {
  group('ConnectionStatusIndicator', () {
    testWidgets('shows "Not connected" when disconnected', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ConnectionStatusIndicator()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Not connected'), findsOneWidget);
      expect(find.byIcon(Icons.cloud_off), findsOneWidget);
    });

    testWidgets('renders without errors', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ConnectionStatusIndicator()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Default state should show the indicator
      expect(find.byType(ConnectionStatusIndicator), findsOneWidget);
    });
  });
}
