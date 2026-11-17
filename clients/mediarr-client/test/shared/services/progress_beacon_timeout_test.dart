import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

/// Captures the request options the client used for progress beacons.
class _CaptureAdapter implements HttpClientAdapter {
  final List<RequestOptions> seen = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    seen.add(options);
    return ResponseBody.fromString(
      jsonEncode({'ok': true}),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  // The progress beacon owns the resume point. While the engine runs a library
  // scan (~113 s measured 2026-11-18) the default 30 s receive timeout dropped
  // reports and the TV logged "took longer than 0:00:30 to receive data".
  test('reportPlaybackProgress tolerates a busy engine', () async {
    final adapter = _CaptureAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'http://localhost:5174'));
    dio.httpClientAdapter = adapter;
    final client = MediarrApiClient(dio: dio);

    await client.reportPlaybackProgress(
      mediaId: 1,
      type: 'movie',
      positionSeconds: 30,
      durationSeconds: 600,
    );

    expect(adapter.seen, hasLength(1));
    expect(adapter.seen.single.path, '/api/playback/progress');
    expect(
      adapter.seen.single.receiveTimeout,
      const Duration(seconds: 120),
      reason: 'A scan-duration stall must not drop the resume bookmark.',
    );
  });

  test('reportAdultProgress uses the same beacon timeout', () async {
    final adapter = _CaptureAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'http://localhost:5174'));
    dio.httpClientAdapter = adapter;
    final client = MediarrApiClient(dio: dio);

    await client.reportAdultProgress(
      mediaId: 2,
      positionSeconds: 30,
      durationSeconds: 600,
    );

    expect(adapter.seen, hasLength(1));
    expect(adapter.seen.single.path, '/api/adult/items/2/progress');
    expect(adapter.seen.single.receiveTimeout, const Duration(seconds: 120));
  });
}
