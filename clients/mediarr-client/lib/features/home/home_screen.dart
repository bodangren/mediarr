import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/services/api_client.dart';
import '../library/continue_watching_section.dart';
import '../playback/playback_screen.dart';

final upcomingProvider = FutureProvider<List<UpcomingItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getUpcoming();
});

final recentlyAddedProvider = FutureProvider<List<ActivityEvent>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getActivity(types: 'download,import', pageSize: 10);
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final continueWatchingAsync = ref.watch(continueWatchingProvider);
    final upcomingAsync = ref.watch(upcomingProvider);
    final recentlyAddedAsync = ref.watch(recentlyAddedProvider);

    return Scaffold(
      backgroundColor: MediarrColors.surfaceBase,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(24, 24, 24, 0),
                child: Text(
                  'Home',
                  style: TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              continueWatchingAsync.when(
                data: (items) => ContinueWatchingSection(
                  items: items,
                  isLoading: false,
                  onResume: (item) => _navigateToPlayback(context, ref, item),
                ),
                loading: () => const ContinueWatchingSection(
                  items: [],
                  isLoading: true,
                  onResume: _noopResume,
                ),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 24),
              _buildSectionHeader('Upcoming'),
              const SizedBox(height: 12),
              upcomingAsync.when(
                data: (items) => _UpcomingRow(items: items),
                loading: () => const _LoadingRow(),
                error: (_, __) => const _EmptySection(message: 'Failed to load upcoming'),
              ),
              const SizedBox(height: 24),
              _buildSectionHeader('Recently Added'),
              const SizedBox(height: 12),
              recentlyAddedAsync.when(
                data: (events) => _RecentlyAddedRow(events: events),
                loading: () => const _LoadingRow(),
                error: (_, __) => const _EmptySection(message: 'Failed to load recent activity'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _navigateToPlayback(BuildContext context, WidgetRef ref, ContinueWatchingItem item) {
    final client = ref.read(apiClientProvider.notifier);
    final streamUrl = client.getStreamUrl(item.mediaId, item.mediaTypeQueryValue);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => PlaybackScreen(
          streamUrl: streamUrl,
          mediaId: item.mediaId,
          mediaType: item.mediaTypeQueryValue,
          title: item.title,
        ),
      ),
    );
  }

  static void _noopResume(ContinueWatchingItem item) {}

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Text(
        title,
        style: const TextStyle(
          color: MediarrColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _UpcomingRow extends StatelessWidget {
  const _UpcomingRow({required this.items});

  final List<UpcomingItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const _EmptySection(message: 'No upcoming releases');
    }

    return SizedBox(
      height: 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = items[index];
          return _UpcomingCard(item: item);
        },
      ),
    );
  }
}

class _UpcomingCard extends StatelessWidget {
  const _UpcomingCard({required this.item});

  final UpcomingItem item;

  @override
  Widget build(BuildContext context) {
    final isEpisode = item.type.toLowerCase() == 'episode';
    final subtitle = isEpisode
        ? 'S${item.seasonNumber?.toString().padLeft(2, '0') ?? '??'}E${item.episodeNumber?.toString().padLeft(2, '0') ?? '??'}'
        : item.date;

    return SizedBox(
      width: 140,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 140,
            height: 100,
            decoration: BoxDecoration(
              color: MediarrColors.surfaceCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: MediarrColors.borderSubtle),
            ),
            child: Center(
              child: Icon(
                isEpisode ? Icons.tv : Icons.movie,
                color: MediarrColors.textMuted,
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(
              color: MediarrColors.textMuted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentlyAddedRow extends StatelessWidget {
  const _RecentlyAddedRow({required this.events});

  final List<ActivityEvent> events;

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const _EmptySection(message: 'No recent activity');
    }

    return SizedBox(
      height: 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: events.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final event = events[index];
          return _ActivityCard(event: event);
        },
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.event});

  final ActivityEvent event;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 200,
            height: 100,
            decoration: BoxDecoration(
              color: MediarrColors.surfaceCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: MediarrColors.borderSubtle),
            ),
            child: Center(
              child: Icon(
                event.success ? Icons.check_circle : Icons.error_outline,
                color: event.success ? MediarrColors.statusSuccess : MediarrColors.statusError,
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            event.summary,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            event.sourceModule,
            style: const TextStyle(
              color: MediarrColors.textMuted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingRow extends StatelessWidget {
  const _LoadingRow();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 180,
      child: Center(
        child: CircularProgressIndicator(
          color: MediarrColors.accentPrimary,
        ),
      ),
    );
  }
}

class _EmptySection extends StatelessWidget {
  const _EmptySection({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: Center(
        child: Text(
          message,
          style: const TextStyle(
            color: MediarrColors.textMuted,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}
