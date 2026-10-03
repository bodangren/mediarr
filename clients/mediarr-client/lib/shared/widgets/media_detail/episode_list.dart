import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/mediarr_theme.dart';
import '../../../core/widgets/netflix_scaffold.dart';

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
    this.onExitDown,
    this.onExitUp,
  });

  final EpisodeListSeason data;
  final int? selectedSeasonNumber;
  final void Function(EpisodeListItem)? onPlayEpisode;
  final void Function(EpisodeListItem)? onSearchEpisode;
  final void Function(EpisodeListItem)? onToggleMonitored;

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
    _selectedSeason =
        widget.selectedSeasonNumber ??
        (widget.data.seasons.isNotEmpty
            ? widget.data.seasons.first.seasonNumber
            : null);
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
        // Chip -> next chip, then row -> its own search control.
        final chip = _focusedChip;
        if (chip != null) {
          if (chip + 1 < _chipNodes.length) {
            _chipNodes[chip + 1].requestFocus();
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        }
        final row = _focusedRow;
        if (row != null && row < _searchNodes.length) {
          _searchNodes[row].requestFocus();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;

      case LogicalKeyboardKey.arrowLeft:
        // Search control -> back to its row.
        final row = _focusedRow;
        if (row == null) return KeyEventResult.ignored;
        final focusedSearch = _searchNodes.indexWhere((n) => n.hasPrimaryFocus);
        if (focusedSearch >= 0 && focusedSearch < _rowNodes.length) {
          _rowNodes[focusedSearch].requestFocus();
          return KeyEventResult.handled;
        }
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
    final searches = _sync(
      _searchNodes,
      widget.onSearchEpisode == null ? 0 : selectedData.episodes.length,
      'EpisodeList.rowSearch',
    );

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
                      onSelect: () =>
                          _selectSeason(widget.data.seasons[i].seasonNumber),
                      child: ExcludeFocus(
                        child: _SeasonChip(
                          seasonNumber: widget.data.seasons[i].seasonNumber,
                          onDiskCount: widget.data.seasons[i].onDiskCount,
                          totalCount: widget.data.seasons[i].totalCount,
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
                searchFocusNode: searches.isEmpty ? null : searches[i],
                rowOrder: kEpisodeRowOrderBase + i,
                onFocused: (hasFocus) => _focusedRow = hasFocus ? i : null,
                onPlay: widget.onPlayEpisode != null
                    ? () => widget.onPlayEpisode!(selectedData.episodes[i])
                    : null,
                onSearch: widget.onSearchEpisode != null
                    ? () => widget.onSearchEpisode!(selectedData.episodes[i])
                    : null,
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
    // No focusNode here: the surrounding `FocusableAction` owns focus, because
    // a ChoiceChip ignores `requestFocus()` on an external node (FR-2).
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
    this.searchFocusNode,
    this.onFocused,
    this.onPlay,
    this.onSearch,
  });

  final EpisodeListItem episode;
  final double rowOrder;
  final FocusNode? focusNode;
  final FocusNode? searchFocusNode;
  final ValueChanged<bool>? onFocused;
  final VoidCallback? onPlay;
  final VoidCallback? onSearch;

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
          onFocusChange: onFocused,
          focusNode: focusNode,
          borderRadius: 8,
          focusPadding: 4,
          child: Container(
            color: MediarrColors.surfaceCard,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
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
                  child: Text(
                    episode.title ?? 'Episode ${episode.episodeNumber}',
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 22,
                    ),
                    overflow: TextOverflow.ellipsis,
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
                if (episode.quality != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _MiniQualityBadge(quality: episode.quality!),
                  ),
                // Play glyph: an affordance only. The row itself plays, so this
                // must not become a second traversal stop.
                if (onPlay != null)
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
                // Secondary action, reached with Right from the row.
                if (onSearch != null)
                  FocusTraversalOrder(
                    order: NumericFocusOrder(rowOrder + 0.5),
                    child: FocusableAction(
                      variant: FocusableActionVariant.button,
                      onSelect: onSearch,
                      focusNode: searchFocusNode,
                      borderRadius: 8,
                      child: const Padding(
                        padding: EdgeInsets.all(8),
                        child: Icon(
                          Icons.search,
                          size: 28,
                          color: MediarrColors.textPrimary,
                        ),
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
