import 'dart:io';

import 'package:connectivity_test/discover.dart';
import 'package:connectivity_test/assertions/library.dart';
import 'package:connectivity_test/assertions/stream.dart';
import 'package:connectivity_test/assertions/sse.dart';
import 'package:http/http.dart' as http;

/// Simple test result.
class _Result {
  _Result(this.name, {this.error});
  final String name;
  final Object? error;
  bool get passed => error == null;
}

Future<void> main() async {
  stdout.writeln('╔══════════════════════════════════════════════╗');
  stdout.writeln('║  Mediarr Connectivity E2E Test               ║');
  stdout.writeln('╚══════════════════════════════════════════════╝');

  // ── 1. Resolve server address ──────────────────────────────────────────────
  String baseUrl;
  final direct = directAddressFromEnv();

  if (direct != null) {
    baseUrl = direct.baseUrl;
    stdout.writeln('[discover] Using MEDIARR_DIRECT_URL → $baseUrl');
  } else {
    final timeoutSecs = int.tryParse(
      Platform.environment['MEDIARR_MDNS_TIMEOUT_SECS'] ?? '10',
    ) ?? 10;
    stdout.writeln('[discover] Scanning mDNS for _mediarr._tcp (${timeoutSecs}s)…');
    try {
      final addr = await discoverViaMulticast(
        timeout: Duration(seconds: timeoutSecs),
      );
      baseUrl = addr.baseUrl;
      stdout.writeln('[discover] Found server at $baseUrl');
    } catch (e) {
      stderr.writeln('[discover] mDNS failed: $e');
      exit(1);
    }
  }

  final results = <_Result>[];

  // ── 2. Connect + system status ─────────────────────────────────────────────
  results.add(await _run('connect: GET /api/system/status', () async {
    final resp = await http.get(Uri.parse('$baseUrl/api/system/status'));
    if (resp.statusCode != 200) {
      throw AssertionError('Expected 200, got ${resp.statusCode}: ${resp.body}');
    }
  }));

  // ── 3. Library: movie ──────────────────────────────────────────────────────
  int movieId = 0;
  results.add(await _run('library: movie list contains fixture', () async {
    movieId = await assertMovieLibrary(baseUrl);
  }));

  // ── 4. Library: series + episode ──────────────────────────────────────────
  int episodeId = 0;
  results.add(await _run('library: series/episode contains fixture', () async {
    episodeId = await assertSeriesLibrary(baseUrl);
  }));

  // ── 5. Stream: movie range request ────────────────────────────────────────
  if (movieId > 0) {
    results.add(await _run('stream: movie 206 range response', () async {
      await assertMovieStream(baseUrl, movieId);
    }));
  } else {
    results.add(_Result('stream: movie 206 range response',
        error: 'Skipped — movie not found'));
  }

  // ── 6. Stream: episode range request ──────────────────────────────────────
  if (episodeId > 0) {
    results.add(await _run('stream: episode 206 range response', () async {
      await assertEpisodeStream(baseUrl, episodeId);
    }));
  } else {
    results.add(_Result('stream: episode 206 range response',
        error: 'Skipped — episode not found'));
  }

  // ── 7. SSE round-trip ─────────────────────────────────────────────────────
  results.add(await _run('sse: event round-trip within 10s', () async {
    await assertSseRoundTrip(baseUrl);
  }));

  // ── Report ─────────────────────────────────────────────────────────────────
  stdout.writeln('');
  stdout.writeln('──────────────────────────────────────────────');
  final passed = results.where((r) => r.passed).length;
  final total = results.length;

  for (final r in results) {
    final icon = r.passed ? '✓' : '✗';
    stdout.writeln('  $icon ${r.name}');
    if (!r.passed) {
      stderr.writeln('      ERROR: ${r.error}');
    }
  }

  stdout.writeln('──────────────────────────────────────────────');
  stdout.writeln('  $passed/$total tests passed');
  stdout.writeln('');

  if (passed < total) {
    exit(1);
  }
}

Future<_Result> _run(String name, Future<void> Function() fn) async {
  stdout.write('[run] $name … ');
  try {
    await fn();
    stdout.writeln('PASS');
    return _Result(name);
  } catch (e) {
    stdout.writeln('FAIL');
    return _Result(name, error: e);
  }
}
