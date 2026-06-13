import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/media_detail/action_bar.dart';
import '../../shared/widgets/media_detail/episode_list.dart';
import '../../shared/widgets/media_detail/file_info_card.dart';
import '../../shared/widgets/media_detail/media_hero.dart';
import '../../shared/widgets/media_detail/metadata_section.dart';
import '../playback/playback_screen.dart';

class SeriesDetailScreen extends ConsumerStatefulWidget {
  const SeriesDetailScreen({super.key, required this.series});

  final Series series;

  @override
  ConsumerState<SeriesDetailScreen> createState() =>
      _SeriesDetailScreenState();
}

class _SeriesDetailScreenState extends ConsumerState<SeriesDetailScreen> {
  Series? _detail;
  bool _loading = true;
  String? _error;
  final Map<int, int> _episodeSeasonMap = {};

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider.notifier);
      final detail = await client.getSeriesDetail(widget.series.id);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _playEpisode(int episodeId) {
    final apiClient = ref.read(apiClientProvider.notifier);
    final streamUrl = apiClient.getStreamUrl(episodeId, 'episode');
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlaybackScreen(
          streamUrl: streamUrl,
          title: '${widget.series.title} — Episode $episodeId',
          mediaId: episodeId,
          mediaType: 'episode',
        ),
      ),
    );
  }

  void _searchEpisode(EpisodeListItem episode) {
    final seasonNumber = _episodeSeasonMap[episode.id] ?? 1;
    final client = ref.read(apiClientProvider.notifier);
    client.searchReleases(
      query: '${widget.series.title} S${_pad(seasonNumber)}E${_pad(episode.episodeNumber)}',
      type: 'episode',
    );
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    final series = _detail ?? widget.series;

    return Scaffold(
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                color: MediarrColors.accentPrimary,
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error,
                          color: MediarrColors.statusError, size: 48),
                      const SizedBox(height: 12),
                      Text('Error loading series detail',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(_error!,
                          style: const TextStyle(
                              color: MediarrColors.textMuted)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadDetail,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _buildContent(context, series),
    );
  }

  Widget _buildContent(BuildContext context, Series series) {
    final actions = <ActionBarAction>[
      ActionBarAction(
        label: 'Search All Missing',
        icon: Icons.search,
        onPressed: () {
          final client = ref.read(apiClientProvider.notifier);
          client.searchReleases(
            query: series.title,
            type: 'series',
            year: series.year,
          );
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Searching for missing episodes...')),
          );
        },
      ),
      ActionBarAction(
        label: 'Delete Series',
        icon: Icons.delete,
        isDestructive: true,
        onPressed: () async {
          final client = ref.read(apiClientProvider.notifier);
          await client.deleteSeries(series.id);
        },
      ),
    ];

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 0, 0),
            child: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
              autofocus: true,
            ),
          ),
          MediaHero(
            posterUrl: series.posterUrl,
            title: series.title,
            subtitle: series.year?.toString(),
          ),
          MetadataSection(
            synopsis: series.overview,
            year: series.year,
            network: series.network,
          ),
          if (series.seasons.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: FileInfoCard(
                sizeBytes: series.sizeOnDisk,
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: EpisodeList(
              data: _buildEpisodeData(series),
              onPlayEpisode: (episode) {
                if (episode.hasFile) {
                  _playEpisode(episode.id);
                }
              },
              onSearchEpisode: _searchEpisode,
            ),
          ),
          ActionBar(actions: actions),
        ],
      ),
    );
  }

  EpisodeListSeason _buildEpisodeData(Series series) {
    _episodeSeasonMap.clear();
    return EpisodeListSeason(
      seasons: series.seasons.map((season) {
        for (final ep in season.episodes) {
          _episodeSeasonMap[ep.id] = season.seasonNumber;
        }
        return EpisodeListSeasonData(
          seasonNumber: season.seasonNumber,
          totalCount: season.episodeCount,
          onDiskCount: season.episodeFileCount,
          episodes: season.episodes.map((ep) {
            return EpisodeListItem(
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              title: ep.title,
              airDateUtc: ep.airDateUtc,
              hasFile: ep.hasFile,
              quality: ep.quality,
            );
          }).toList(),
        );
      }).toList(),
    );
  }
}
