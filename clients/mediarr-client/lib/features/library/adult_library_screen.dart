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
  });

  final MediarrApiClient api;
  final void Function(AdultItem item)? onSelect;
  final bool autofocusFirst;
  final int pageSize;

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

  Future<void> _load() async {
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
      setState(() => _page = page);
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

  void _goToPage(int page) {
    _pageNumber = page;
    _load();
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
                    : GridView.builder(
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 300,
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          mainAxisExtent: 120,
                        ),
                        itemCount: items.length,
                        itemBuilder: (context, index) => AdultItemCard(
                          item: items[index],
                          autofocus: widget.autofocusFirst && index == 0,
                          onSelect: () => widget.onSelect?.call(items[index]),
                        ),
                      ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  TextButton(
                    onPressed: (_pageNumber > 1 && !_loading) ? () => _goToPage(_pageNumber - 1) : null,
                    child: const Text('Previous'),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Page $_pageNumber of ${page?.totalPages ?? 1}',
                    style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: ((page?.totalPages ?? 1) > _pageNumber && !_loading)
                        ? () => _goToPage(_pageNumber + 1)
                        : null,
                    child: const Text('Next'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
