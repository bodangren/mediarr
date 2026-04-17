import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('SseEvent', () {
    test('parses event and data correctly', () {
      const event = SseEvent(event: 'torrent:stats', data: {'infoHash': 'abc123'});
      expect(event.event, 'torrent:stats');
      expect(event.data, {'infoHash': 'abc123'});
    });
  });

  group('SSE parsing', () {
    test('parses SSE formatted data correctly', () async {
      final controller = StreamController<SseEvent>();

      void parseSseData(String raw) {
        final lines = raw.split('\n');
        String? eventType;
        String? data;

        for (final line in lines) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            data = line.substring(5).trim();
          }
        }

        if (eventType != null && data != null) {
          dynamic parsed;
          try {
            parsed = {'parsed': data};
          } catch (_) {
            parsed = data;
          }
          controller.add(SseEvent(event: eventType, data: parsed));
        }
      }

      parseSseData('event: torrent:stats\ndata: {"infoHash":"abc123","name":"test"}');

      await expectLater(
        controller.stream.take(1),
        emits(predicate<SseEvent>((e) =>
          e.event == 'torrent:stats' &&
          (e.data as Map)['parsed'] == '{"infoHash":"abc123","name":"test"}'
        )),
      );

      await controller.close();
    });

    test('parses activity:new event correctly', () async {
      final controller = StreamController<SseEvent>();

      void parseSseData(String raw) {
        final lines = raw.split('\n');
        String? eventType;
        String? data;

        for (final line in lines) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            data = line.substring(5).trim();
          }
        }

        if (eventType != null && data != null) {
          dynamic parsed;
          try {
            parsed = {'parsed': data};
          } catch (_) {
            parsed = data;
          }
          controller.add(SseEvent(event: eventType, data: parsed));
        }
      }

      parseSseData('event: activity:new\ndata: {"id":1,"eventType":"download","success":true}');

      await expectLater(
        controller.stream.take(1),
        emits(predicate<SseEvent>((e) =>
          e.event == 'activity:new' &&
          (e.data as Map)['parsed'] == '{"id":1,"eventType":"download","success":true}'
        )),
      );

      await controller.close();
    });
  });

  group('TorrentItem.fromJson', () {
    test('parses torrent stats data correctly', () {
      final json = {
        'infoHash': 'abc123',
        'name': 'Test.Movie.2024.S01E01.1080p.WEB',
        'status': 'downloading',
        'progress': 45.5,
        'downloadSpeed': 1024000,
        'uploadSpeed': 0,
        'size': 1500000000,
        'downloaded': 500000000,
        'uploaded': 0,
        'eta': 3600,
      };

      final torrent = TorrentItem.fromJson(json);

      expect(torrent.infoHash, 'abc123');
      expect(torrent.name, 'Test.Movie.2024.S01E01.1080p.WEB');
      expect(torrent.status, 'downloading');
      expect(torrent.progress, 45.5);
      expect(torrent.downloadSpeed, 1024000);
      expect(torrent.eta, 3600);
    });
  });

  group('ActivityEvent.fromJson', () {
    test('parses activity event data correctly', () {
      final json = {
        'id': 1,
        'eventType': 'download',
        'sourceModule': 'TorrentManager',
        'success': true,
        'summary': 'Downloaded Test.Movie.2024.mkv',
        'occurredAt': '2024-04-17T10:30:00.000Z',
      };

      final event = ActivityEvent.fromJson(json);

      expect(event.id, 1);
      expect(event.eventType, 'download');
      expect(event.sourceModule, 'TorrentManager');
      expect(event.success, true);
      expect(event.summary, 'Downloaded Test.Movie.2024.mkv');
    });
  });
}
