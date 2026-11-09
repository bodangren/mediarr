import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_player_service.dart';
import 'package:mediarr_client/shared/models/music.dart';

MusicTrack _track(int id) => MusicTrack(id: id, title: 'Track $id', albumId: 1, artistId: 1);

void main() {
  test('shuffle keeps the current track first and preserves every track', () {
    final canonical = [for (var i = 0; i < 10; i++) _track(i)];
    final shuffled = buildShuffledOrder(canonical, 3, Random(7));
    expect(shuffled.first.id, 3);
    expect(shuffled.map((t) => t.id).toSet(), canonical.map((t) => t.id).toSet());
    expect(shuffled.length, canonical.length);
  });

  test('next index repeats all or stops when repeat is off', () {
    expect(nextQueueIndex(index: 1, length: 3, repeat: MusicRepeatMode.off), 2);
    expect(nextQueueIndex(index: 2, length: 3, repeat: MusicRepeatMode.off), isNull);
    expect(nextQueueIndex(index: 2, length: 3, repeat: MusicRepeatMode.all), 0);
    expect(nextQueueIndex(index: 0, length: 1, repeat: MusicRepeatMode.all), 0);
    expect(nextQueueIndex(index: 0, length: 0, repeat: MusicRepeatMode.all), isNull);
  });

  test('previous wraps only with repeat all', () {
    expect(previousQueueIndex(index: 2, length: 3, repeat: MusicRepeatMode.off), 1);
    expect(previousQueueIndex(index: 0, length: 3, repeat: MusicRepeatMode.off), isNull);
    expect(previousQueueIndex(index: 0, length: 3, repeat: MusicRepeatMode.all), 2);
  });

  test('repeat cycles off -> all -> one -> off', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);
    expect(service.cycleRepeat(), MusicRepeatMode.all);
    expect(service.cycleRepeat(), MusicRepeatMode.one);
    expect(service.cycleRepeat(), MusicRepeatMode.off);
  });

  test('moveItem keeps the current track selected and removeAt advances', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);
    final queue = [_track(1), _track(2), _track(3)];
    await service.playQueue(tracks: queue, index: 1, urlFor: (id) => '/x/$id');
    service.moveItem(2, 0);
    final afterMove = container.read(musicPlayerProvider);
    expect(afterMove.queue.map((t) => t.id).toList(), [3, 1, 2]);
    expect(afterMove.current?.id, 2);
    await service.removeAt(2);
    expect(container.read(musicPlayerProvider).queue.map((t) => t.id).toList(), [3, 1]);
  });

  test('shuffle toggle reports state even for an empty queue', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final service = container.read(musicPlayerProvider.notifier);
    service.toggleShuffle();
    expect(container.read(musicPlayerProvider).shuffle, isTrue);
    service.toggleShuffle();
    expect(container.read(musicPlayerProvider).shuffle, isFalse);
  });
}

