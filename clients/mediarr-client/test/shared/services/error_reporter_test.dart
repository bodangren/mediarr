import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/services/error_reporter.dart';

/// Records what the reporter would POST, without touching the network.
class _RecordingApiClient extends MediarrApiClient {
  final List<Map<String, dynamic>> reports = [];
  int failCount = 0;

  @override
  Future<void> reportClientError({
    required String message,
    String? stack,
    String severity = 'error',
    String? route,
    Map<String, dynamic>? context,
  }) async {
    if (failCount > 0) {
      failCount -= 1;
      throw StateError('server unreachable');
    }
    reports.add({
      'message': message,
      'severity': severity,
      'route': route,
      'context': context,
    });
  }
}

void main() {
  test('deduplicates identical failures', () async {
    final client = _RecordingApiClient();
    final reporter = ErrorReporter(client);
    await reporter.report(message: 'boom', stack: 'trace A');
    await reporter.report(message: 'boom', stack: 'trace A');
    expect(client.reports, hasLength(1));
  });

  test('caps reports per session so a loop cannot flood the server', () async {
    final client = _RecordingApiClient();
    final reporter = ErrorReporter(client, maxReportsPerSession: 3);
    for (var i = 0; i < 10; i++) {
      await reporter.report(message: 'failure $i');
    }
    expect(client.reports, hasLength(3));
    expect(reporter.canReport, isFalse);
  });

  test('a telemetry POST failure never throws to the caller', () async {
    final client = _RecordingApiClient()..failCount = 1;
    final reporter = ErrorReporter(client);
    await expectLater(reporter.report(message: 'offline'), completes);
  });

  test('attaches the current route when none is given', () async {
    final client = _RecordingApiClient();
    final reporter = ErrorReporter(client)..currentRoute = '/library';
    await reporter.report(message: 'boom');
    expect(client.reports.single['route'], '/library');
  });

  test('spools a report while offline and flushes it when reachable', () async {
    final dir = Directory.systemTemp.createTempSync('mediarr-spool-');
    addTearDown(() => dir.deleteSync(recursive: true));
    final spool = File('${dir.path}/spool.jsonl');

    final offline = _RecordingApiClient()..failCount = 1;
    final reporter = ErrorReporter(offline)..spoolFileOverride = () async => spool;
    await reporter.report(message: 'offline failure');
    expect(spool.existsSync(), isTrue);
    expect(spool.readAsLinesSync().where((l) => l.trim().isNotEmpty), hasLength(1));

    // Server is reachable again: the spooled record is delivered.
    final online = _RecordingApiClient();
    final flusher = ErrorReporter(online)..spoolFileOverride = () async => spool;
    await flusher.flushSpool();
    expect(online.reports.single['message'], 'offline failure');
    expect(spool.readAsLinesSync().where((l) => l.trim().isNotEmpty), isEmpty);
  });
}
