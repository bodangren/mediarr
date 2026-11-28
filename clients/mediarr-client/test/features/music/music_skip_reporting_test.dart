import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_player_service.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

MusicTrack _track(int id) => MusicTrack(id: id, title: 'Track $id', albumId: 1, artistId: 1);

/// Owner request 2026-11-28: "track which music I skip as an anti-indicator of what I want."
/// Every way of leaving a track early must reach `POST /api/music/tracks/:id/skip`; approaching the
/// end of a track is left to the server's completed-play rule.
void main() {
  test('next() reports the track it leaves as a skip', () async {
    final api = FakeMediarrApiClient();
    final container = ProviderContainer(overrides: [apiClientProvider.overrideWith((ref) => api)]);
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);

    await service.playQueue(tracks: [_track(1), _track(2)], index: 0, urlFor: (id) => '/music/$id');
    await service.next();

    expect(api.musicSkipCalls, hasLength(1));
    expect(api.musicSkipCalls.single.trackId, 1);
  });

  test('jumping to another queue entry reports the abandoned track', () async {
    final api = FakeMediarrApiClient();
    final container = ProviderContainer(overrides: [apiClientProvider.overrideWith((ref) => api)]);
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);

    await service.playQueue(tracks: [_track(3), _track(4)], index: 0, urlFor: (id) => '/music/$id');
    await service.jumpTo(1);

    expect(api.musicSkipCalls.single.trackId, 3);
  });

  test('starting a new queue while a track plays reports the outgoing track', () async {
    final api = FakeMediarrApiClient();
    final container = ProviderContainer(overrides: [apiClientProvider.overrideWith((ref) => api)]);
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);

    await service.playQueue(tracks: [_track(5), _track(6)], index: 0, urlFor: (id) => '/music/$id');
    await service.playQueue(tracks: [_track(7)], index: 0, urlFor: (id) => '/music/$id');

    expect(api.musicSkipCalls.map((call) => call.trackId).toList(), [5]);
  });

  test('restarting the same track (repeat one) is not a skip', () async {
    final api = FakeMediarrApiClient();
    final container = ProviderContainer(overrides: [apiClientProvider.overrideWith((ref) => api)]);
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);

    await service.playQueue(tracks: [_track(8)], index: 0, urlFor: (id) => '/music/$id');
    service.cycleRepeat();
    service.cycleRepeat(); // repeat all -> one
    await service.next();

    expect(api.musicSkipCalls, isEmpty);
  });
}
