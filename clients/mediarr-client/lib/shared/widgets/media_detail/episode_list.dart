import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/mediarr_theme.dart';
import '../../models/subtitle_availability.dart';
import '../../services/api_config.dart';
import '../../../core/widgets/netflix_scaffold.dart';
import '../subtitle_badge.dart';

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
    this.progress = 0,
    this.isWatched = false,
    this.thumbUrl,
    this.subtitleAvailability,
  });

  final int id;
  final int episodeNumber;
  final String? title;
  final String? airDateUtc;
  final bool hasFile;
  final String? quality;

  /// 0..1 watched fraction of an in-progress episode (0 when unwatched or
  /// finished). Surfaced as a progress bar under the row title.
  final double progress;

  /// True once the server has marked the episode watched.
  final bool isWatched;

  /// Server-side still for this episode; absent until the thumbnail cache is
  /// warm, in which case the row keeps its text-only layout.
  final String? thumbUrl;

  /// Server-truth Chinese/English subtitle availability (FR-5). Null when the
  /// payload does not carry it, so the row renders no badge rather than a
  /// misleading "missing" one.
  final SubtitleAvailability? subtitleAvailability;
}

/// Season chips plus the episode list of the selected season (FR-2).
///
/// The D-pad walk is **deterministic and owned by this widget**. Flutter's own
/// directional focus is geometric, and that was the defect the owner reported:
/// pressing Down from the season chips skipped every episode and landed on the
/// series action bar, because the rows had no traversal stops of their own. Even
/// with numeric traversal orders the last hop still resolved by geometry, since
/// an episode row spans x 189..1252 and the button nearest its centre is
/// `Delete Series`. So the arrows that belong to this list are consumed here and
/// the exits are delegated to the host through [onExitDown] and [onExitUp].
class EpisodeList extends StatefulWidget {
  const EpisodeList({
    super.key,
    required this.data,
    this.selectedSeasonNumber,
    this.onPlayEpisode,
    this.onSearchEpisode,
    this.onToggleMonitored,
    this.onContextMenu,
    this.onSeasonContextMenu,
    this.onExitDown,
    this.onExitUp,
  });

  final EpisodeListSeason data;
  final int? selectedSeasonNumber;
  final void Function(EpisodeListItem)? onPlayEpisode;
  final void Function(EpisodeListItem)? onSearchEpisode;
  final void Function(EpisodeListItem)? onToggleMonitored;

  /// Remote Menu key / long-press on a row: open the episode context menu.
  final void Function(EpisodeListItem)? onContextMenu;

  /// Remote Menu key on a season chip: open the season context menu
  /// (mark whole season watched/unwatched).
  final void Function(EpisodeListSeasonData)? onSeasonContextMenu;

  /// Moves focus to the first control **below** the episode list. Wired by
  /// `SeriesDetailScreen` to the first action-bar button (FR-2).
  final VoidCallback? onExitDown;

  /// Moves focus to the first control **above** the episode list (FR-2).
  final VoidCallback? onExitUp;

  @override
  State<EpisodeList> createState() => EpisodeListState();
}

/// Traversal order of the first episode row. The season chips occupy 0..n, so
/// the rows start well clear of them (FR-2).
const double kEpisodeRowOrderBase = 1000;

/// Traversal order of the series-level controls that follow the episode list.
const double kPostEpisodeOrderBase = 100000;

/// State of [EpisodeList], public so `SeriesDetailScreen` can drive the walk
/// into the list (FR-2).
class EpisodeListState extends State<EpisodeList> {
  /// Puts focus on the first season chip. Used by the host so Down from the
  /// page header enters the list instead of jumping to the rail.
  bool focusFirstChip() {
    if (_chipNodes.isEmpty) return false;
    _chipNodes.first.requestFocus();
    return true;
  }

  /// Puts focus on the first episode row of the selected season.
  bool focusFirstRow() {
    if (_rowNodes.isEmpty) return false;
    _rowNodes.first.requestFocus();
    return true;
  }

  late int? _selectedSeason;

  /// Focus nodes the D-pad walk drives directly (FR-2).
  final List<FocusNode> _chipNodes = [];
  final List<FocusNode> _rowNodes = [];
  final List<FocusNode> _searchNodes = [];

  /// Index of the focused chip and the focused row, or null when neither.
  int? _focusedChip;
  int? _focusedRow;

  @override
  void initState() {
    super.initState();
    _selectedSeason = widget.selectedSeasonNumber ?? _defaultSeasonNumber();
  }

  /// The season the list opens on.
  ///
  /// Owner-measured defect 2026-11-07: opening on the *first* season landed on
  /// `S0` for Murderbot, whose single episode is a missing special, so Select
  /// did nothing a viewer could see. The default is therefore the first season
  /// that actually has an episode with a file, falling back to the first
  /// season (and then to specials) when nothing has been downloaded yet.
  int? _defaultSeasonNumber() {
    final seasons = widget.data.seasons;
    if (seasons.isEmpty) return null;
    for (final season in seasons) {
      if (season.episodes.any((episode) => episode.hasFile)) {
        return season.seasonNumber;
      }
    }
    return seasons.first.seasonNumber;
  }

  @override
  void dispose() {
    _disposeAll(_chipNodes);
    _disposeAll(_rowNodes);
    _disposeAll(_searchNodes);
    super.dispose();
  }

  static void _disposeAll(List<FocusNode> nodes) {
    for (final node in nodes) {
      node.dispose();
    }
    nodes.clear();
  }

  /// Grows or shrinks [nodes] to [count], disposing the surplus.
  static List<FocusNode> _sync(List<FocusNode> nodes, int count, String label) {
    while (nodes.length > count) {
      nodes.removeLast().dispose();
    }
    while (nodes.length < count) {
      nodes.add(FocusNode(debugLabel: label));
    }
    return nodes;
  }

  /// Switches the visible season and clears the row focus, so the next Down
  /// enters the new season's first episode.
  void _selectSeason(int seasonNumber) {
    setState(() {
      _selectedSeason = seasonNumber;
      _focusedRow = null;
    });
  }

  List<EpisodeListItem> _selectedEpisodes() {
    if (widget.data.seasons.isEmpty) return const [];
    final selected = widget.data.seasons.firstWhere(
      (s) => s.seasonNumber == _selectedSeason,
      orElse: () => widget.data.seasons.first,
    );
    return selected.episodes;
  }

  /// The deterministic D-pad walk (FR-2). See [EpisodeList] for why.
  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final episodes = _selectedEpisodes();

    switch (event.logicalKey) {
      case LogicalKeyboardKey.arrowDown:
        // Chip block -> first episode.
        if (_focusedChip != null &&
            episodes.isNotEmpty &&
            _rowNodes.isNotEmpty) {
          _rowNodes.first.requestFocus();
          return KeyEventResult.handled;
        }
        final row = _focusedRow;
        if (row == null) return KeyEventResult.ignored;
        if (row + 1 < episodes.length && row + 1 < _rowNodes.length) {
          _rowNodes[row + 1].requestFocus();
          return KeyEventResult.handled;
        }
        // Past the last episode: hand over to the host rather than letting
        // geometry choose, so Delete Series is never the next stop.
        final exitDown = widget.onExitDown;
        if (exitDown == null) return KeyEventResult.ignored;
        exitDown();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.arrowUp:
        final row = _focusedRow;
        if (row != null) {
          if (row > 0) {
            _rowNodes[row - 1].requestFocus();
          } else if (_chipNodes.isNotEmpty) {
            _chipNodes.first.requestFocus();
          }
          return KeyEventResult.handled;
        }
        if (_focusedChip != null) {
          final exitUp = widget.onExitUp;
          if (exitUp == null) return KeyEventResult.ignored;
          exitUp();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;

      case LogicalKeyboardKey.arrowRight:
        // Chips walk sideways. Episode rows own no right-hand control: the
        // owner reported that Right moved to an unexplained magnifier and that
        // Select on the row then appeared to do nothing (2026-11-07). Select
        // is the only row action, so Right is left to the traversal group.
        final chip = _focusedChip;
        if (chip != null && chip + 1 < _chipNodes.length) {
          _chipNodes[chip + 1].requestFocus();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;

      case LogicalKeyboardKey.arrowLeft:
        // Left stays owned by the shell: it is the pinned exit from the content
        // area to the rail (test/features/library/library_dpad_test.dart), so
        // the episode walk must not swallow it (FR-3 kept this contract).
        return KeyEventResult.ignored;

      default:
        return KeyEventResult.ignored;
    }
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

    final chips = _sync(
      _chipNodes,
      widget.data.seasons.length,
      'EpisodeList.chip',
    );
    final rows = _sync(
      _rowNodes,
      selectedData.episodes.length,
      'EpisodeList.row',
    );
    // Per-row search stops were removed 2026-11-07: they were the unexplained
    // magnifier the owner hit by pressing Right on an episode.
    _sync(_searchNodes, 0, 'EpisodeList.rowSearch');

    // Key anchor only. It must never be a traversal stop itself, or it would
    // swallow the arrows (the F3 class of defect in tv-ux-investigation).
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: _handleKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Wrap(
              spacing: 8,
              children: [
                for (var i = 0; i < widget.data.seasons.length; i++)
                  FocusTraversalOrder(
                    order: NumericFocusOrder(i.toDouble()),
                    // The chip stays the visual, but this wrapper owns focus.
                    // A `ChoiceChip` manages focus internally and ignores
                    // `requestFocus()` on an external node, so driving the chip
                    // node directly did nothing and focus fell through to the
                    // rail. Only the chip itself is excluded, never the
                    // wrapper: `ExcludeFocus` also sets
                    // `descendantsAreFocusable: false`, which rejects the
                    // wrapper's own focus request.
                    child: FocusableAction(
                      variant: FocusableActionVariant.button,
                      focusNode: chips[i],
                      borderRadius: 16,
                      focusPadding: 4,
                      onFocusChange: (hasFocus) =>
                          _focusedChip = hasFocus ? i : null,
                      onContextMenu: widget.onSeasonContextMenu == null
                          ? null
                          : () => widget.onSeasonContextMenu!(
                                widget.data.seasons[i],
                              ),
                      onSelect: () =>
                          _selectSeason(widget.data.seasons[i].seasonNumber),
                      child: ExcludeFocus(
                        child: _SeasonChip(
                          seasonNumber: widget.data.seasons[i].seasonNumber,
                          onDiskCount: widget.data.seasons[i].onDiskCount,
                          totalCount: widget.data.seasons[i].totalCount,
                          watchedCount: widget.data.seasons[i].episodes
                              .where((episode) => episode.isWatched)
                              .length,
                          isSelected:
                              widget.data.seasons[i].seasonNumber ==
                              _selectedSeason,
                          onTap: () => _selectSeason(
                            widget.data.seasons[i].seasonNumber,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          for (var i = 0; i < selectedData.episodes.length; i++)
            FocusTraversalOrder(
              order: NumericFocusOrder(kEpisodeRowOrderBase + i),
              child: _EpisodeRow(
                episode: selectedData.episodes[i],
                focusNode: rows[i],
                rowOrder: kEpisodeRowOrderBase + i,
                onFocused: (hasFocus) => _focusedRow = hasFocus ? i : null,
                onPlay: widget.onPlayEpisode != null
                    ? () => widget.onPlayEpisode!(selectedData.episodes[i])
                    : null,
                onSearch: widget.onSearchEpisode != null
                    ? () => widget.onSearchEpisode!(selectedData.episodes[i])
                    : null,
                onContextMenu: widget.onContextMenu == null
                    ? null
                    : () => widget.onContextMenu!(selectedData.episodes[i]),
              ),
            ),
        ],
      ),
    );
  }
}

class _SeasonChip extends StatelessWidget {
  const _SeasonChip({
    required this.seasonNumber,
    this.onDiskCount,
    this.totalCount,
    this.watchedCount = 0,
    required this.isSelected,
    required this.onTap,
  });

  final int seasonNumber;
  final int? onDiskCount;
  final int? totalCount;

  /// Episodes of this season the server has marked watched.
  final int watchedCount;

  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // No focusNode here: the surrounding `FocusableAction` owns focus, because
    // a ChoiceChip ignores `requestFocus()` on an external node (FR-2).
    return ChoiceChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Selection is stated with a check, not with the accent fill: the
          // filled purple belonged to focus (the Play button, focused tiles), so
          // a selected chip looked focused all the time (Kimi K3.1 review,
          // 2026-11-17). Purple now means "focus", the tick means "you are
          // looking at this season".
          if (isSelected) ...[
            const Icon(Icons.check, size: 16, color: MediarrColors.accentPrimary),
            const SizedBox(width: 4),
          ],
          Text('S$seasonNumber'),
          if (onDiskCount != null && totalCount != null) ...[
            const SizedBox(width: 4),
            Text('$onDiskCount/$totalCount'),
          ],
          // Library tracking at a glance: how much of this season is watched.
          if (watchedCount > 0)
            Text(
              ' · ✓$watchedCount',
              style: TextStyle(color: MediarrColors.statusSuccess),
            ),
        ],
      ),
      selected: isSelected,
      onSelected: (_) => onTap(),
      selectedColor: MediarrColors.surfaceElevated,
      labelStyle: TextStyle(
        color: isSelected
            ? MediarrColors.textPrimary
            : MediarrColors.textSecondary,
        fontSize: 16,
      ),
      side: BorderSide(
        color: isSelected
            ? MediarrColors.accentPrimary.withValues(alpha: 0.5)
            : MediarrColors.borderSubtle,
      ),
      backgroundColor: MediarrColors.surfaceElevated,
    );
  }
}

/// One episode row (FR-2).
///
/// The **whole row is the focus stop**, and Select on it plays the episode. The
/// previous implementation rendered no traversal stop at all, so the episodes
/// could not be reached with the remote.
class _EpisodeRow extends StatelessWidget {
  const _EpisodeRow({
    required this.episode,
    required this.rowOrder,
    this.focusNode,
    this.onFocused,
    this.onPlay,
    this.onSearch,
    this.onContextMenu,
  });

  final EpisodeListItem episode;
  final double rowOrder;
  final FocusNode? focusNode;
  final ValueChanged<bool>? onFocused;
  final VoidCallback? onPlay;

  /// Select fallback for an episode with no file on disk.
  final VoidCallback? onSearch;

  /// Menu-key / long-press action for this row.
  final VoidCallback? onContextMenu;

  /// Select plays the episode when the file exists and searches for it when it
  /// does not. The old wiring passed a play callback that did nothing for a
  /// missing episode, so Select looked broken.
  VoidCallback? get _onSelect {
    if (episode.hasFile) return onPlay;
    return onSearch;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      // Constrain the row: on a TV the screen is ~1600 px wide, and an
      // unconstrained row put the action icons a full screen away from the
      // episode title (F13).
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1100),
        child: FocusableAction(
          variant: FocusableActionVariant.button,
          onSelect: _onSelect,
          onContextMenu: onContextMenu,
          onFocusChange: onFocused,
          focusNode: focusNode,
          borderRadius: 8,
          focusPadding: 4,
          child: Container(
            color: MediarrColors.surfaceCard,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                if (episode.thumbUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: CachedNetworkImage(
                      imageUrl: ApiConfig.image(episode.thumbUrl!),
                      width: 112,
                      height: 63,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(width: 112, height: 63, color: MediarrColors.surfaceElevated),
                      errorWidget: (_, __, ___) =>
                          Container(width: 112, height: 63, color: MediarrColors.surfaceElevated),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                SizedBox(
                  width: 48,
                  child: Text(
                    '${episode.episodeNumber}',
                    style: const TextStyle(
                      color: MediarrColors.textSecondary,
                      fontSize: 20,
                    ),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        episode.title ?? 'Episode ${episode.episodeNumber}',
                        style: TextStyle(
                          // Watched episodes read as secondary so the eye
                          // finds the next unwatched one (library tracking).
                          color: episode.isWatched
                              ? MediarrColors.textSecondary
                              : MediarrColors.textPrimary,
                          fontSize: 22,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (!episode.isWatched && episode.progress > 0.01) ...[
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(2),
                          child: LinearProgressIndicator(
                            value: episode.progress.clamp(0.0, 1.0),
                            minHeight: 4,
                            backgroundColor:
                                Colors.white.withValues(alpha: 0.16),
                            valueColor: const AlwaysStoppedAnimation(
                              MediarrColors.accentPrimary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (episode.isWatched)
                  const Padding(
                    padding: EdgeInsets.only(right: 10),
                    child: Icon(
                      Icons.check_circle,
                      color: MediarrColors.accentPrimary,
                      size: 26,
                    ),
                  ),
                // Missing marker, so a row that will search says so.
                if (!episode.hasFile)
                  const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: Text(
                      'Missing',
                      style: TextStyle(
                        color: MediarrColors.textMuted,
                        fontSize: 14,
                      ),
                    ),
                  ),
                if (episode.hasFile && episode.subtitleAvailability != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: SubtitleBadge(
                      availability: episode.subtitleAvailability!,
                      compact: true,
                    ),
                  ),
                if (episode.quality != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _MiniQualityBadge(quality: episode.quality!),
                  ),
                // Play glyph: an affordance only, and only when there is
                // something to play. The row itself plays, so this must not
                // become a second traversal stop. A missing episode used to show
                // a play triangle next to its search glyph, promising playback
                // it cannot deliver (seen on Monarch S2 on the TV, 2026-11-18).
                if (onPlay != null && episode.hasFile)
                  const ExcludeFocus(
                    child: Padding(
                      padding: EdgeInsets.only(right: 4),
                      child: Icon(
                        Icons.play_arrow,
                        size: 32,
                        color: MediarrColors.textPrimary,
                      ),
                    ),
                  ),
                // Affordance only. Select on the row is the single action, so
                // the glyph must not become a second traversal stop (owner
                // report 2026-11-07: Right landed on an unexplained magnifier).
                if (!episode.hasFile)
                  const ExcludeFocus(
                    child: Padding(
                      padding: EdgeInsets.only(right: 4),
                      child: Icon(
                        Icons.search,
                        size: 28,
                        color: MediarrColors.textMuted,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
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
