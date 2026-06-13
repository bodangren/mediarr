import 'package:flutter/material.dart';

import '../../../core/theme/mediarr_theme.dart';

class EpisodeListSeason {
  const EpisodeListSeason({this.seasons = const []});

  final List<EpisodeListSeasonData> seasons;
}

class EpisodeListSeasonData {
  const EpisodeListSeasonData({
    required this.seasonNumber,
    this.totalCount,
    this.onDiskCount,
    this.episodes = const [],
  });

  final int seasonNumber;
  final int? totalCount;
  final int? onDiskCount;
  final List<EpisodeListItem> episodes;
}

class EpisodeListItem {
  const EpisodeListItem({
    required this.id,
    required this.episodeNumber,
    this.title,
    this.airDateUtc,
    this.hasFile = false,
    this.quality,
  });

  final int id;
  final int episodeNumber;
  final String? title;
  final String? airDateUtc;
  final bool hasFile;
  final String? quality;
}

class EpisodeList extends StatefulWidget {
  const EpisodeList({
    super.key,
    required this.data,
    this.selectedSeasonNumber,
    this.onPlayEpisode,
    this.onSearchEpisode,
    this.onToggleMonitored,
  });

  final EpisodeListSeason data;
  final int? selectedSeasonNumber;
  final void Function(EpisodeListItem)? onPlayEpisode;
  final void Function(EpisodeListItem)? onSearchEpisode;
  final void Function(EpisodeListItem)? onToggleMonitored;

  @override
  State<EpisodeList> createState() => _EpisodeListState();
}

class _EpisodeListState extends State<EpisodeList> {
  late int? _selectedSeason;

  @override
  void initState() {
    super.initState();
    _selectedSeason = widget.selectedSeasonNumber ??
        (widget.data.seasons.isNotEmpty
            ? widget.data.seasons.first.seasonNumber
            : null);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.data.seasons.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(
            'No seasons available',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }

    final selectedData = widget.data.seasons.firstWhere(
      (s) => s.seasonNumber == _selectedSeason,
      orElse: () => widget.data.seasons.first,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Season chips
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Wrap(
            spacing: 8,
            children: [
              for (final season in widget.data.seasons)
                _SeasonChip(
                  seasonNumber: season.seasonNumber,
                  onDiskCount: season.onDiskCount,
                  totalCount: season.totalCount,
                  isSelected: season.seasonNumber == _selectedSeason,
                  onTap: () {
                    setState(() {
                      _selectedSeason = season.seasonNumber;
                    });
                  },
                ),
            ],
          ),
        ),
        // Episode list
        for (final episode in selectedData.episodes)
          _EpisodeRow(
            episode: episode,
            onPlay: widget.onPlayEpisode != null
                ? () => widget.onPlayEpisode!(episode)
                : null,
            onSearch: widget.onSearchEpisode != null
                ? () => widget.onSearchEpisode!(episode)
                : null,
          ),
      ],
    );
  }
}

class _SeasonChip extends StatelessWidget {
  const _SeasonChip({
    required this.seasonNumber,
    this.onDiskCount,
    this.totalCount,
    required this.isSelected,
    required this.onTap,
  });

  final int seasonNumber;
  final int? onDiskCount;
  final int? totalCount;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('S$seasonNumber'),
          if (onDiskCount != null && totalCount != null) ...[
            const SizedBox(width: 4),
            Text('$onDiskCount/$totalCount'),
          ],
        ],
      ),
      selected: isSelected,
      onSelected: (_) => onTap(),
      selectedColor: MediarrColors.accentPrimary.withValues(alpha: 0.3),
      labelStyle: TextStyle(
        color: isSelected
            ? MediarrColors.textPrimary
            : MediarrColors.textSecondary,
        fontSize: 12,
      ),
      side: BorderSide(
        color: isSelected
            ? MediarrColors.accentPrimary
            : MediarrColors.borderSubtle,
      ),
      backgroundColor: MediarrColors.surfaceElevated,
    );
  }
}

class _EpisodeRow extends StatelessWidget {
  const _EpisodeRow({
    required this.episode,
    this.onPlay,
    this.onSearch,
  });

  final EpisodeListItem episode;
  final VoidCallback? onPlay;
  final VoidCallback? onSearch;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        children: [
          // Episode number
          SizedBox(
            width: 36,
            child: Text(
              '${episode.episodeNumber}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          // Title
          Expanded(
            child: Text(
              episode.title ?? 'Episode ${episode.episodeNumber}',
              style: Theme.of(context).textTheme.bodyMedium,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Quality badge
          if (episode.quality != null)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: _MiniQualityBadge(quality: episode.quality!),
            ),
          // Action icons
          if (onPlay != null)
            IconButton(
              icon: const Icon(Icons.play_arrow, size: 20),
              onPressed: onPlay,
              visualDensity: VisualDensity.compact,
            ),
          if (onSearch != null)
            IconButton(
              icon: const Icon(Icons.search, size: 20),
              onPressed: onSearch,
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}

class _MiniQualityBadge extends StatelessWidget {
  const _MiniQualityBadge({required this.quality});
  final String quality;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: MediarrColors.accentPrimary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        quality,
        style: const TextStyle(
          color: MediarrColors.accentPrimary,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
