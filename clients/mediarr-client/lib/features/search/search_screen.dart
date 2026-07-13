import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/focusable_card.dart';
import '../../shared/models/search_result.dart';
import '../../shared/services/api_client.dart';
import 'search_result_detail_sheet.dart';

final searchQueryProvider = StateProvider<String>((ref) => '');

final searchResultsProvider = FutureProvider<List<SearchResult>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.trim().isEmpty) return [];
  final client = ref.read(apiClientProvider.notifier);
  return client.search(query);
});

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      ref.read(searchQueryProvider.notifier).state = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final searchResultsAsync = ref.watch(searchResultsProvider);
    final query = ref.watch(searchQueryProvider);

    return Scaffold(
      backgroundColor: MediarrColors.surfaceBase,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Text(
                  'Search',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(width: 24),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    focusNode: _focusNode,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Search movies and series...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: MediarrColors.surfaceCard,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: searchResultsAsync.when(
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
                      'Search failed: $error',
                      style: const TextStyle(
                        color: MediarrColors.textMuted,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              data: (results) {
                if (query.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search,
                          color: MediarrColors.textMuted,
                          size: 64,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Enter a search term to find movies and series',
                          style: TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                if (results.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.movie_filter,
                          color: MediarrColors.textMuted,
                          size: 64,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No results for "$query"',
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.all(24),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 200,
                    childAspectRatio: 0.6,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: results.length,
                  itemBuilder: (context, index) {
                    final result = results[index];
                    return _SearchResultCard(
                      result: result,
                      autofocus: index == 0,
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchResultCard extends StatelessWidget {
  const _SearchResultCard({
    required this.result,
    this.autofocus = false,
  });

  final SearchResult result;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return FocusableCard(
      autofocus: autofocus,
      onPressed: () => _showDetailSheet(context, result),
      width: 180,
      height: 300,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: result.posterUrl != null
                ? CachedNetworkImage(
                    imageUrl: result.posterUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => _Placeholder(title: result.title),
                    errorWidget: (_, __, ___) => _Placeholder(title: result.title),
                  )
                : _Placeholder(title: result.title),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            color: MediarrColors.surfaceElevated,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.title,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    if (result.year != null)
                      Text(
                        '${result.year}',
                        style: const TextStyle(
                          color: MediarrColors.textMuted,
                          fontSize: 11,
                        ),
                      ),
                    const Spacer(),
                    _MediaTypeBadge(mediaType: result.mediaType),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDetailSheet(BuildContext context, SearchResult result) {
    showModalBottomSheet(
      context: context,
      backgroundColor: MediarrColors.surfaceCard,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SearchResultDetailSheet(result: result),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: MediarrColors.surfaceHover,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.movie, color: MediarrColors.textMuted, size: 40),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                title,
                style: const TextStyle(
                  color: MediarrColors.textMuted,
                  fontSize: 11,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MediaTypeBadge extends StatelessWidget {
  const _MediaTypeBadge({required this.mediaType});
  final String mediaType;

  @override
  Widget build(BuildContext context) {
    final isMovie = mediaType.toLowerCase() == 'movie';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: (isMovie ? MediarrColors.accentPrimary : MediarrColors.accentSecondary)
            .withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(
          color: (isMovie ? MediarrColors.accentPrimary : MediarrColors.accentSecondary)
              .withValues(alpha: 0.4),
        ),
      ),
      child: Text(
        isMovie ? 'MOVIE' : 'SERIES',
        style: TextStyle(
          color: isMovie ? MediarrColors.accentPrimary : MediarrColors.accentSecondary,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
