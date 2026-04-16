import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/services/api_client.dart';
import 'queue_item_detail_sheet.dart';

final torrentsProvider = FutureProvider<List<TorrentItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getTorrents();
});

final activityProvider = FutureProvider<List<ActivityEvent>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getActivity();
});

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MediarrColors.surfaceBase,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Activity',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ),
          Container(
            color: MediarrColors.surfaceCard,
            child: TabBar(
              controller: _tabController,
              indicatorColor: MediarrColors.accentPrimary,
              labelColor: MediarrColors.accentPrimary,
              unselectedLabelColor: MediarrColors.textMuted,
              tabs: const [
                Tab(text: 'Queue', icon: Icon(Icons.downloading, size: 20)),
                Tab(text: 'History', icon: Icon(Icons.history, size: 20)),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: const [
                _QueueTab(),
                _HistoryTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueTab extends ConsumerWidget {
  const _QueueTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final torrentsAsync = ref.watch(torrentsProvider);

    return torrentsAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(
          color: MediarrColors.accentPrimary,
        ),
      ),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: MediarrColors.statusError,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load queue: $error',
              style: const TextStyle(
                color: MediarrColors.textMuted,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
      data: (torrents) {
        if (torrents.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.download_outlined,
                  color: MediarrColors.textMuted,
                  size: 64,
                ),
                SizedBox(height: 16),
                Text(
                  'No active downloads',
                  style: TextStyle(
                    color: MediarrColors.textMuted,
                    fontSize: 16,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Downloads will appear here',
                  style: TextStyle(
                    color: MediarrColors.textMuted,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(torrentsProvider);
          },
          color: MediarrColors.accentPrimary,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: torrents.length,
            itemBuilder: (context, index) {
              final torrent = torrents[index];
              return _TorrentCard(torrent: torrent);
            },
          ),
        );
      },
    );
  }
}

class _TorrentCard extends StatelessWidget {
  const _TorrentCard({required this.torrent});

  final TorrentItem torrent;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showDetailSheet(context, torrent),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _StatusIcon(status: torrent.status),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          torrent.name,
                          style: const TextStyle(
                            color: MediarrColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${torrent.formattedSize} • ${torrent.formattedSpeed}',
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: torrent.status),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: torrent.progress / 100,
                  backgroundColor: MediarrColors.surfaceHover,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    torrent.isCompleted
                        ? MediarrColors.statusSuccess
                        : MediarrColors.accentPrimary,
                  ),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${(torrent.progress).toStringAsFixed(1)}%',
                    style: const TextStyle(
                      color: MediarrColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  if (torrent.eta != null && !torrent.isCompleted)
                    Text(
                      'ETA: ${torrent.formattedEta}',
                      style: const TextStyle(
                        color: MediarrColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  if (torrent.isCompleted)
                    const Text(
                      'Complete',
                      style: TextStyle(
                        color: MediarrColors.statusSuccess,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDetailSheet(BuildContext context, TorrentItem torrent) {
    showModalBottomSheet(
      context: context,
      backgroundColor: MediarrColors.surfaceCard,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => QueueItemDetailSheet(torrent: torrent),
    );
  }
}

class _StatusIcon extends StatelessWidget {
  const _StatusIcon({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (status.toLowerCase()) {
      case 'downloading':
        icon = Icons.downloading;
        color = MediarrColors.accentPrimary;
        break;
      case 'paused':
        icon = Icons.pause_circle_outline;
        color = MediarrColors.statusWarning;
        break;
      case 'seeding':
        icon = Icons.upload;
        color = MediarrColors.statusSuccess;
        break;
      case 'completed':
        icon = Icons.check_circle;
        color = MediarrColors.statusSuccess;
        break;
      default:
        icon = Icons.help_outline;
        color = MediarrColors.textMuted;
    }

    return Icon(icon, color: color, size: 28);
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    String label;

    switch (status.toLowerCase()) {
      case 'downloading':
        bgColor = MediarrColors.accentPrimary.withValues(alpha: 0.2);
        textColor = MediarrColors.accentPrimary;
        label = 'Downloading';
        break;
      case 'paused':
        bgColor = MediarrColors.statusWarning.withValues(alpha: 0.2);
        textColor = MediarrColors.statusWarning;
        label = 'Paused';
        break;
      case 'seeding':
        bgColor = MediarrColors.statusSuccess.withValues(alpha: 0.2);
        textColor = MediarrColors.statusSuccess;
        label = 'Seeding';
        break;
      case 'completed':
        bgColor = MediarrColors.statusSuccess.withValues(alpha: 0.2);
        textColor = MediarrColors.statusSuccess;
        label = 'Complete';
        break;
      default:
        bgColor = MediarrColors.textMuted.withValues(alpha: 0.2);
        textColor = MediarrColors.textMuted;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _HistoryTab extends ConsumerWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activityAsync = ref.watch(activityProvider);

    return activityAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(
          color: MediarrColors.accentPrimary,
        ),
      ),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: MediarrColors.statusError,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load history: $error',
              style: const TextStyle(
                color: MediarrColors.textMuted,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
      data: (events) {
        if (events.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.history,
                  color: MediarrColors.textMuted,
                  size: 64,
                ),
                SizedBox(height: 16),
                Text(
                  'No activity yet',
                  style: TextStyle(
                    color: MediarrColors.textMuted,
                    fontSize: 16,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Recent events will appear here',
                  style: TextStyle(
                    color: MediarrColors.textMuted,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(activityProvider);
          },
          color: MediarrColors.accentPrimary,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: events.length,
            itemBuilder: (context, index) {
              final event = events[index];
              return _ActivityEventCard(event: event);
            },
          ),
        );
      },
    );
  }
}

class _ActivityEventCard extends StatelessWidget {
  const _ActivityEventCard({required this.event});

  final ActivityEvent event;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _EventIcon(success: event.success, eventType: event.eventType),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.summary,
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        event.sourceModule,
                        style: const TextStyle(
                          color: MediarrColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTime(event.occurredAt),
                        style: const TextStyle(
                          color: MediarrColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';

    return '${time.month}/${time.day}/${time.year}';
  }
}

class _EventIcon extends StatelessWidget {
  const _EventIcon({required this.success, required this.eventType});

  final bool success;
  final String eventType;

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    if (!success) {
      icon = Icons.error_outline;
      color = MediarrColors.statusError;
    } else {
      switch (eventType.toLowerCase()) {
        case 'download':
          icon = Icons.download_done;
          color = MediarrColors.statusSuccess;
          break;
        case 'import':
          icon = Icons.input;
          color = MediarrColors.statusSuccess;
          break;
        case 'grab':
          icon = Icons.add_circle_outline;
          color = MediarrColors.accentPrimary;
          break;
        case 'search':
          icon = Icons.search;
          color = MediarrColors.accentSecondary;
          break;
        case 'health':
          icon = Icons.favorite;
          color = MediarrColors.statusInfo;
          break;
        default:
          icon = Icons.info_outline;
          color = MediarrColors.textMuted;
      }
    }

    return Icon(icon, color: color, size: 24);
  }
}
