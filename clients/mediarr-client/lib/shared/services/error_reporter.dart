import 'dart:async';

import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import 'api_client.dart';

/// Ships client failures to the Mediarr server so the owner never has to
/// recite a screen-by-screen bug list.
///
/// The TV box is only reachable over ADB, so anything the viewer sees is
/// otherwise invisible. [ErrorReporter.install] captures uncaught Flutter
/// errors and [ErrorReporter.report] is called explicitly from the playback
/// paths, where a failure is recoverable and a stack trace alone is useless.
class ErrorReporter {
  ErrorReporter(this._client, {this.maxReportsPerSession = 60});

  final MediarrApiClient _client;
  final int maxReportsPerSession;

  /// Fingerprints already sent this session, so a crash loop cannot flood the
  /// server with the same line.
  final Set<String> _seen = <String>{};
  int _sent = 0;
  bool _installed = false;
  Future<void>? _flushInFlight;

  /// Optional spool override for tests.
  Future<File> Function()? spoolFileOverride;

  /// The route the user is currently on, so a report carries its context.
  String? currentRoute;

  /// Last known screen, used when no route is available.
  String? currentScreen;

  /// Whether another report would be accepted (exposed for tests).
  bool get canReport => _sent < maxReportsPerSession;

  /// Installs global handlers. Safe to call once.
  void install() {
    if (_installed) return;
    _installed = true;

    final previousFlutterHandler = FlutterError.onError;
    FlutterError.onError = (details) {
      previousFlutterHandler?.call(details);
      unawaited(report(
        message: details.exceptionAsString(),
        stack: details.stack?.toString(),
        severity: 'flutter',
        context: {'library': details.library},
      ));
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      unawaited(report(
        message: error.toString(),
        stack: stack.toString(),
        severity: 'uncaught',
      ));
      return true;
    };
  }

  /// Posts one failure. Never throws and never blocks the caller's flow.
  Future<void> report({
    required String message,
    String? stack,
    String severity = 'error',
    String? route,
    Map<String, dynamic>? context,
  }) async {
    if (!canReport) return;
    final fingerprint = '$message|${stack?.split('\n').take(2).join('|') ?? ''}';
    if (!_seen.add(fingerprint)) return;
    _sent += 1;

    final payload = <String, dynamic>{
      'message': message,
      'stack': stack,
      'severity': severity,
      'route': route ?? currentRoute ?? currentScreen,
      'context': context,
    };

    try {
      await _client.reportClientError(
        message: message,
        stack: stack,
        severity: severity,
        route: payload['route'] as String?,
        context: context,
      );
    } catch (_) {
      // The server is unreachable — exactly the situation that produces the
      // failure the owner is seeing. Spool it so it is not lost.
      await _spool(payload);
    }
  }

  Future<File> _spoolFile() async {
    final override = spoolFileOverride;
    if (override != null) return override();
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/client-error-spool.jsonl');
  }

  Future<void> _spool(Map<String, dynamic> payload) async {
    try {
      final file = await _spoolFile();
      await file.parent.create(recursive: true);
      await file.writeAsString(
        '${jsonEncode(payload)}\n',
        mode: FileMode.append,
        flush: true,
      );
    } catch (_) {}
  }

  /// Retries every spooled report. Safe to call often; concurrent calls are
  /// coalesced and a fully-flushed spool is a no-op.
  Future<void> flushSpool() async {
    _flushInFlight ??= _flushSpoolInner().whenComplete(() {
      _flushInFlight = null;
    });
    return _flushInFlight!;
  }

  Future<void> _flushSpoolInner() async {
    File file;
    try {
      file = await _spoolFile();
      if (!await file.exists()) return;
    } catch (_) {
      return;
    }

    final remaining = <String>[];
    try {
      final lines = await file.readAsLines();
      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) continue;
        try {
          final item = jsonDecode(trimmed) as Map<String, dynamic>;
          await _client.reportClientError(
            message: (item['message'] as String?) ?? 'unknown client error',
            stack: item['stack'] as String?,
            severity: (item['severity'] as String?) ?? 'error',
            route: item['route'] as String?,
            context: item['context'] is Map<String, dynamic>
                ? item['context'] as Map<String, dynamic>
                : null,
          );
        } catch (_) {
          // Still offline (or a torn line): keep it for the next attempt.
          remaining.add(trimmed);
        }
      }
      await file.writeAsString(
        remaining.map((line) => '$line\n').join(),
        flush: true,
      );
    } catch (_) {}
  }
}
