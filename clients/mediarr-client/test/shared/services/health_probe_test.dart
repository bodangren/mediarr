import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/services/error_reporter.dart';

void main() {
  group('health probe resilience', () {
    late Dio dio;
    late Dio reporterDio;
    late MediarrApiClient client;
    late MediarrApiClient reporterClient;
    late ErrorReporter reporter;
    late List<String> reportedPaths;
    var statusAttempts = 0;

    setUp(() {
      reportedPaths = <String>[];
      statusAttempts = 0;
      dio = Dio();
      client = MediarrApiClient(dio: dio);
      reporterDio = Dio();
      reporterClient = MediarrApiClient(dio: reporterDio);
      reporterDio.interceptors.insert(
        0,
        InterceptorsWrapper(
          onRequest: (options, handler) {
            reportedPaths.add(options.path);
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {'ok': true},
            ));
          },
        ),
      );
      reporter = ErrorReporter(reporterClient);
      client.errorReporter = reporter;
    });

    tearDown(() => client.dispose());

    test('a transient refusal during a restart is retried, not reported', () async {
      dio.interceptors.insert(
        0,
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (!options.path.contains('/api/system/status')) {
              return handler.resolve(Response(
                requestOptions: options,
                statusCode: 200,
                data: {'version': '1.0.0'},
              ));
            }
            statusAttempts += 1;
            if (statusAttempts == 1) {
              // Server is restarting: the first poll is refused.
              return handler.reject(DioException(
                requestOptions: options,
                type: DioExceptionType.connectionError,
                message: 'Connection refused',
              ));
            }
            return handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {'version': '1.0.0'},
            ));
          },
        ),
      );

      final up = await client.probeHealth(retrying: true);

      expect(up, isTrue);
      expect(statusAttempts, 2, reason: 'exactly one retry');
      expect(client.state.status, ConnectionStatus.connected);
      expect(
        reportedPaths.where((p) => p.contains('/api/client-errors')),
        isEmpty,
        reason: 'a restart window must not masquerade as a client defect; it '
            'produced phantom triage records twice on 2026-11-08',
      );
    });

    test('a real outage still reports, once, after the retry', () async {
      dio.interceptors.insert(
        0,
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (!options.path.contains('/api/system/status')) {
              return handler.resolve(Response(
                requestOptions: options,
                statusCode: 200,
                data: {'ok': true},
              ));
            }
            return handler.reject(DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
              message: 'Connection refused',
            ));
          },
        ),
      );

      final up = await client.probeHealth(retrying: true);

      expect(up, isFalse);
      expect(client.state.status, ConnectionStatus.error);
      expect(
        reportedPaths.where((p) => p.contains('/api/client-errors')).length,
        1,
        reason: 'a genuine outage must reach triage, exactly once per probe',
      );
    });

    test('reports an outage only once across repeated failed probes', () async {
      dio.interceptors.insert(
        0,
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (!options.path.contains('/api/system/status')) {
              return handler.resolve(Response(
                requestOptions: options,
                statusCode: 200,
                data: {'ok': true},
              ));
            }
            return handler.reject(DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
              message: 'Connection refused',
            ));
          },
        ),
      );

      await client.probeHealth(retrying: true);
      await client.probeHealth(retrying: true);
      await client.probeHealth(retrying: true);

      expect(
        reportedPaths.where((p) => p.contains('/api/client-errors')).length,
        1,
        reason: 'A down server fails every 30 s probe; on 2026-11-08 that wrote '
            'one record per poll. Triage needs one record per outage.',
      );
    });
  });
}
