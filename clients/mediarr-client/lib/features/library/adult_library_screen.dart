import 'dart:async';

import 'package:flutter/material.dart';

import '../../shared/models/adult_item.dart';
import '../../shared/services/api_client.dart';
import 'adult_item_card.dart';

/// Adult library screen (track feature_adult_library_20261107).
///
/// A separate screen with its own data path (`/api/adult/*`), search, a review counter and paged
/// results. Selecting a card hands the item to `onSelect` so the caller owns playback and progress —
/// this screen never touches movie/episode playback.
class AdultLibraryScreen extends StatefulWidget {
  const AdultLibraryScreen({
    super.key,
    required this.api,
    this.onSelect,
    this.autofocusFirst = true,
    this.pageSize = 24,
    this.baseUrl,
  });

  final MediarrApiClient api;
  final void Function(AdultItem item)? onSelect;
  final bool autofocusFirst;
  final int pageSize;

  /// API origin for thumbnail URLs; supplied by the router from the client state.
  final String? baseUrl;

  @override
  State<AdultLibraryScreen> createState() => _AdultLibraryScreenState();
}

class _AdultLibraryScreenState extends State<AdultLibraryScreen> {
  final _searchController = TextEditingController();
  AdultItemsPage? _page;
  bool _loading = false;
  String? _error;
  int _pageNumber = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({bool append = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await widget.api.getAdultItems(
        query: _searchController.text,
        page: _pageNumber,
        pageSize: widget.pageSize,
      );
      if (!mounted) return;
      setState(() {
        _page = append && _page != null
            ? AdultItemsPage(
                items: [..._page!.items, ...page.items],
                page: page.page,
                pageSize: page.pageSize,
                totalCount: page.totalCount,
                needsReview: page.needsReview,
              )
            : page;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = 'Could not load the Adult library: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _submitSearch(String value) {
    _pageNumber = 1;
    _load();
  }

  /// Auto-advance: the remote has no obvious way to reach paging buttons, so focusing a card near
  /// the end of the grid loads the next page and appends it.
  void _maybeLoadNext(int index) {
    final page = _page;
    if (page == null || _loading) return;
    if (_pageNumber >= page.totalPages) return;
    // Prefetch two rows early so a fast Down press never outruns the network (review finding).
    if (index < page.items.length - 8) return;
    _pageNumber += 1;
    unawaited(_load(append: true));
  }

  String? _thumbUrl(AdultItem item) {
    final thumb = item.thumbUrl;
    if (thumb == null) return null;
    final base = widget.baseUrl ?? '';
    return thumb.startsWith('http') ? thumb : '$base$thumb';
  }

  @override
  Widget build(BuildContext context) {
    final page = _page;
    final items = page?.items ?? const <AdultItem>[];
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Adult',
                    style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      '${page?.totalCount ?? 0} items'
                      '${(page?.needsReview ?? 0) > 0 ? ' · ${page!.needsReview} need review' : ''}',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16),
                    ),
                  ),
                  SizedBox(
                    width: 360,
                    child: TextField(
                      controller: _searchController,
                      onSubmitted: _submitSearch,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      decoration: const InputDecoration(
                        hintText: 'Search title, filename or studio',
                        hintStyle: TextStyle(color: Color(0xFF6B7280)),
                        prefixIcon: Icon(Icons.search, color: Color(0xFF6B7280)),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Color(0xFFF87171), fontSize: 16)),
              Expanded(
                child: _loading && items.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : Stack(children: [
                      GridView.builder(
                        // Card height fits a 96px still + title + metadata + the review badge. At 120 it
                        // clipped the badge, so the header claimed "8 need review" while no visible card
                        // showed one (review finding, 2026-11-08).
                        padding: const EdgeInsets.only(bottom: 48),
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 320,
                          mainAxisSpacing: 16,
                          crossAxisSpacing: 16,
                          mainAxisExtent: 190,
                        ),
                        itemCount: items.length,
                        itemBuilder: (context, index) => AdultItemCard(
                          item: items[index],
                          autofocus: widget.autofocusFirst && index == 0,
                          imageUrl: _thumbUrl(items[index]),
                          onFocused: () => _maybeLoadNext(index),
                          onSelect: () => widget.onSelect?.call(items[index]),
                        ),
                      ),
                      // Auto-paging is silent otherwise: nothing tells the viewer more is coming or
                      // that they reached the end (review finding, 2026-11-08).
                      if (_loading)
                        const Positioned(
                          left: 0,
                          right: 0,
                          bottom: 8,
                          child: Center(
                            child: Text('Loading more…', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
                          ),
                        )
                      else if (page != null && _pageNumber >= page.totalPages)
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 8,
                          child: Center(
                            child: Text(
                              '${page.items.length} of ${page.totalCount} · end of list',
                              style: const TextStyle(color: Color(0xFF6B7280), fontSize: 13),
                            ),
                          ),
                        ),
                    ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
