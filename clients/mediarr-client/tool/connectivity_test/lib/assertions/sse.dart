import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Subscribe to /api/events/stream, trigger a server-side event via the test
/// route, and assert that the event is delivered within [timeout].
Future<void> assertSseRoundTrip(
  String baseUrl, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  const testEvent = 'test:ping';
  final sseUri = Uri.parse('$baseUrl/api/events/stream');
  final triggerUri = Uri.parse('$baseUrl/api/__test__/emit-event');

  final completer = Completer<void>();
  HttpClient? sseClient;

  try {
    sseClient = HttpClient();
    final req = await sseClient.getUrl(sseUri);
    req.headers.set('Accept', 'text/event-stream');
    req.headers.set('Cache-Control', 'no-cache');
    final resp = await req.close();

    if (resp.statusCode != 200) {
      throw AssertionError(
        'SSE: /api/events/stream returned ${resp.statusCode}',
      );
    }

    // Listen on the stream in the background
    final sub = resp
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen((line) {
      // SSE lines: "event: <name>", "data: <json>", blank line
      if (line.startsWith('event:')) {
        final event = line.substring('event:'.length).trim();
        if (event == testEvent && !completer.isCompleted) {
          completer.complete();
        }
      }
    }, onError: (Object err) {
      if (!completer.isCompleted) {
        completer.completeError(AssertionError('SSE stream error: $err'));
      }
    });

    // Small delay to ensure SSE connection is established before we trigger
    await Future<void>.delayed(const Duration(milliseconds: 300));

    // Trigger the event via the test-only route
    final triggerClient = HttpClient();
    try {
      final triggerReq = await triggerClient.postUrl(triggerUri);
      triggerReq.headers.contentType = ContentType.json;
      triggerReq.write(jsonEncode({'event': testEvent, 'payload': {'source': 'connectivity-test'}}));
      final triggerResp = await triggerReq.close();
      if (triggerResp.statusCode != 200) {
        final body = await triggerResp.transform(utf8.decoder).join();
        throw AssertionError(
          'SSE trigger returned ${triggerResp.statusCode}: $body',
        );
      }
      await triggerResp.drain<void>();
    } finally {
      triggerClient.close(force: true);
    }

    // Wait for the event to arrive
    await completer.future.timeout(
      timeout,
      onTimeout: () {
        throw AssertionError(
          'SSE: event "$testEvent" not received within ${timeout.inSeconds}s.',
        );
      },
    );

    await sub.cancel();
  } finally {
    sseClient?.close(force: true);
  }
}
