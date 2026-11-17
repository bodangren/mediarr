import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mediarr_client/shared/services/api_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/library_search_item.dart';
import '../../shared/services/api_client.dart';
import '../library/movie_detail_screen.dart';
import '../library/poster_grid.dart';
import '../library/series_detail_screen.dart';
import 'search_keyboard.dart';

/// Combined movie + series + episode search backed by `GET /api/library/search`.
///
/// Server-side and debounced (Kimi home/search review): typing sends a cancellable query instead of
/// filtering two whole libraries locally, results are typed with counts, and episodes can be opened.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _queryFocusNode = FocusNode(debugLabel: 'SearchScreen.query');
  final _keyboardFocusNode = FocusNode(debugLabel: 'SearchScreen.keyboard');
  final _queryController = TextEditingController();
  Timer? _debounce;
  int _requestSeq = 0;
  String _query = '';
  String _typeFilter = 'all'; // all | movie | series | episode
  List<LibrarySearchItem> _results = const [];
  bool _loading = false;
  String? _error;

  /// One focus node per result card, so Back from a detail screen returns the
  /// remote to the exact card that was opened instead of the top of the grid.
  final Map<String, FocusNode> _resultNodes = {};

  String _nodeKey(LibrarySearchItem item) => '${item.type}:${item.id}';

  /// Owner report 2026-11-16/17: once focus was in the search text area there
  /// was no way out — the field eats the arrows as cursor movement and system
  /// Back exits the app instead of leaving the field.
  ///
  /// Leaves text entry deterministically: unfocus the field and put the remote
  /// back on a visible control (first result, else the D-pad keyboard's first
  /// key, else nothing focusable so the rail takes the next press).
  void _leaveQueryField() {
    if (!_queryFocusNode.hasFocus) return;
    _queryFocusNode.unfocus();
    for (final node in _resultNodes.values) {
      if (node.context != null) {
        node.requestFocus();
        return;
      }
    }
    // No results yet: hand focus to the on-screen keyboard.
    _keyboardFocusNode.requestFocus();
  }

  /// Answer the keys that would otherwise trap the remote in the text field.
  KeyEventResult _handleQueryKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    switch (event.logicalKey) {
      case LogicalKeyboardKey.arrowDown:
        // Down leaves the field for the results (or the keyboard when empty).
        _leaveQueryField();
        return KeyEventResult.handled;
      case LogicalKeyboardKey.escape:
      case LogicalKeyboardKey.goBack:
      case LogicalKeyboardKey.browserBack:
        _leaveQueryField();
        return KeyEventResult.handled;
      default:
        return KeyEventResult.ignored;
    }
  }

  FocusNode _nodeFor(LibrarySearchItem item) => _resultNodes.putIfAbsent(
        _nodeKey(item),
        () => FocusNode(debugLabel: 'SearchResult ${_nodeKey(item)}'),
      );

  @override
  void dispose() {
    _debounce?.cancel();
    _queryFocusNode.dispose();
    _keyboardFocusNode.dispose();
    _queryController.dispose();
    for (final node in _resultNodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  Future<void> _runSearch() async {
    final term = _query.trim();
    final seq = ++_requestSeq;
    if (term.isEmpty) {
      setState(() {
        _results = const [];
        _loading = false;
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await ref
          .read(apiClientProvider.notifier)
          .searchLibrary(query: term, limit: 50);
      if (!mounted || seq != _requestSeq) return; // a newer keystroke won
      setState(() {
        _results = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _error = 'Search failed: $error';
        _loading = false;
      });
    }
  }

  void _onQueryChanged(String value) {
    setState(() {
      _query = value;
      if (value.trim().isEmpty) _results = const [];
    });
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      if (mounted) unawaited(_runSearch());
    });
  }

  void _appendCharacter(String character) {
    if (_queryController.text.length >= 80) return;
    _queryController.text = '${_queryController.text}$character';
    _queryController.selection =
        TextSelection.collapsed(offset: _queryController.text.length);
    _onQueryChanged(_queryController.text);
  }

  void _backspace() {
    final text = _queryController.text;
    if (text.isEmpty) return;
    _queryController.text = text.substring(0, text.length - 1);
    _queryController.selection =
        TextSelection.collapsed(offset: _queryController.text.length);
    _onQueryChanged(_queryController.text);
  }

  void _clearQuery() {
    _queryController.clear();
    _onQueryChanged('');
  }

  Future<void> _open(LibrarySearchItem result) async {
    final client = ref.read(apiClientProvider.notifier);
    final navigator = Navigator.of(context, rootNavigator: true);
    Widget? page;
    if (result.isMovie) {
      final movie = await client.getMovie(result.id);
      if (movie != null) page = MovieDetailScreen(movie: movie);
    } else {
      final seriesId = result.isEpisode ? result.seriesId : result.id;
      if (seriesId == null) return;
      final series = await client.getSeriesById(seriesId);
      if (series != null) page = SeriesDetailScreen(series: series);
    }
    if (page == null || !mounted) return;
    await navigator.push(MaterialPageRoute<void>(builder: (_) => page!));
    // Back from the detail returns to the card that opened it (Kimi review:
    // detail return must restore the exact originating focus).
    if (!mounted) return;
    _resultNodes[_nodeKey(result)]?.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final movieCount = _results.where((r) => r.isMovie).length;
    final seriesCount = _results.where((r) => r.isSeries).length;
    final episodeCount = _results.where((r) => r.isEpisode).length;
    final visible = _typeFilter == 'all'
        ? _results
        : _results.where((r) => r.type == _typeFilter).toList();

    return PopScope(
      // While the query field owns the remote, system Back must leave the field
      // rather than quit the app (the reported "locked in" symptom).
      canPop: !_queryFocusNode.hasFocus,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leaveQueryField();
      },
      child: NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 20, 24, 0),
              child: Text(
                'Search',
                style: TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left: query field + the D-pad keyboard. A remote cannot
                    // type, so the keyboard is the primary input; the field
                    // still accepts a hardware keyboard on the TV box.
                    SizedBox(
                      width: 400,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // No TextField here: on the TV a focused text input
                          // hands D-pad control to Android's system IME, which
                          // covers the results and swallows the remote (owner
                          // report 2026-11-17: "once I was in the search text
                          // area, I was unable to leave"). The D-pad keyboard is
                          // the only input; this row shows the query and stays a
                          // focus stop, so Right still reaches the filter chips
                          // and Down from them the results (asserted by
                          // search_screen_test.dart).
                          Focus(
                            onKeyEvent: _handleQueryKey,
                            child: Container(
                              height: 56,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: MediarrColors.surfaceCard,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: MediarrColors.borderSubtle),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.search,
                                      color: MediarrColors.textSecondary),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ValueListenableBuilder<TextEditingValue>(
                                      valueListenable: _queryController,
                                      builder: (context, value, _) => Text(
                                        value.text.isEmpty
                                            ? 'Search movies, series and episodes'
                                            : value.text,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: value.text.isEmpty
                                              ? MediarrColors.textMuted
                                              : MediarrColors.textPrimary,
                                          fontSize: 20,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SearchKeyboard(
                            onCharacter: _appendCharacter,
                            onBackspace: _backspace,
                            onClear: _clearQuery,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _FilterChip(
                                label: 'All · ${_results.length}',
                                selected: _typeFilter == 'all',
                                onSelect: () => setState(() => _typeFilter = 'all'),
                              ),
                              _FilterChip(
                                label: 'Movies · $movieCount',
                                selected: _typeFilter == 'movie',
                                onSelect: () => setState(() => _typeFilter = 'movie'),
                              ),
                              _FilterChip(
                                label: 'Series · $seriesCount',
                                selected: _typeFilter == 'series',
                                onSelect: () => setState(() => _typeFilter = 'series'),
                              ),
                              _FilterChip(
                                label: 'Episodes · $episodeCount',
                                selected: _typeFilter == 'episode',
                                onSelect: () => setState(() => _typeFilter = 'episode'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Expanded(child: _buildResults(visible)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildResults(List<LibrarySearchItem> visible) {
    if (_loading && _results.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: MediarrColors.accentPrimary),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _error!,
              style: const TextStyle(color: MediarrColors.textMuted, fontSize: 18),
            ),
            const SizedBox(height: 16),
            FocusableAction(
              autofocus: true,
              onSelect: () => unawaited(_runSearch()),
              borderRadius: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: MediarrColors.surfaceCard,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: MediarrColors.borderSubtle),
                ),
                child: const Text('Retry',
                    style: TextStyle(
                        color: MediarrColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      );
    }
    if (_query.trim().isEmpty) {
      return const Center(
        child: Text(
          'Type to search movies, series and episodes',
          style: TextStyle(color: MediarrColors.textMuted, fontSize: 20),
        ),
      );
    }
    if (visible.isEmpty) {
      return Center(
        child: Text(
          _loading ? 'Searching…' : 'No matches for "${_query.trim()}"',
          style: const TextStyle(color: MediarrColors.textMuted, fontSize: 18),
        ),
      );
    }
    if (_typeFilter != 'all') {
      return LayoutBuilder(
        builder: (context, constraints) => _grid(visible, constraints.maxWidth),
      );
    }
    // Ranked sections instead of one mixed grid (Kimi review): movies first,
    // then series, then episodes, each with its own header and row.
    final sections = <(String, List<LibrarySearchItem>)>[
      ('Movies', _results.where((r) => r.isMovie).toList()),
      ('TV series', _results.where((r) => r.isSeries).toList()),
      ('Episodes', _results.where((r) => r.isEpisode).toList()),
    ];
    final nonEmpty = sections.where((section) => section.$2.isNotEmpty).toList();
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          for (final section in nonEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 8),
              child: Text(
                section.$1,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            _grid(section.$2, constraints.maxWidth),
          ],
        ],
      ),
    );
  }

  Widget _grid(List<LibrarySearchItem> items, double width) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      gridDelegate: posterGridDelegateFor(width),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final result = items[index];
        return FocusableAction(
          focusNode: _nodeFor(result),
          onSelect: () => _open(result),
          borderRadius: 8,
          child: _ResultCard(result: result),
        );
      },
    );
  }
}


class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onSelect});

  final String label;
  final bool selected;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onSelect,
      borderRadius: 20,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? MediarrColors.accentPrimary : MediarrColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: MediarrColors.borderSubtle),
        ),
        child: Text(label,
            style: const TextStyle(
                color: MediarrColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});

  final LibrarySearchItem result;

  String get _context {
    if (result.isEpisode) {
      final series = result.subtitle == null ? '' : '${result.subtitle} · ';
      return '$series${result.episodeLabel}';
    }
    if (result.isSeries) return result.year == null ? 'TV series' : 'TV series · ${result.year}';
    return result.year == null ? 'Movie' : 'Movie · ${result.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: result.posterUrl != null
              ? CachedNetworkImage(
                  imageUrl: ApiConfig.image(result.posterUrl!),
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(color: MediarrColors.surfaceCard),
                  errorWidget: (_, __, ___) =>
                      Container(color: MediarrColors.surfaceCard),
                )
              : Container(color: MediarrColors.surfaceCard),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                result.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                _context,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: MediarrColors.textMuted, fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
