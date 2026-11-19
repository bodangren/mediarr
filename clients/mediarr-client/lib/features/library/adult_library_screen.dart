import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/adult_item.dart';
import '../../shared/services/api_client.dart';
import 'adult_decision_prompt.dart';
import 'adult_item_card.dart';

/// Adult library screen (track feature_adult_library_20261107).
///
/// A separate screen with its own data path (`/api/adult/*`), search, a review counter and paged
/// results. Selecting a card hands the item to `onSelect` so the caller owns playback and progress —
/// this screen never touches movie/episode playback.
///
/// Retention track (2026-11-11): watched-but-undecided items get a "Needs a decision" strip with
/// big **Keep** / **Delete** targets, and a focused grid card for such an item reveals the same two
/// actions (Down enters them). Both call the one durable decision endpoint; delete asks for a single
/// focused confirmation first. After a decision the list refreshes.
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

  /// Watched-but-undecided items (`GET /api/adult/decisions`), newest watched first.
  List<AdultDecisionCandidate> _decisions = const [];
  int _decisionsTotal = 0;

  /// Ids whose decision request is in flight, so a double Select cannot double-post.
  final Set<int> _deciding = {};

  /// Focus targets used to put the viewer back on a real control after the decisions list shrinks.
  final FocusNode _firstDecisionFocus = FocusNode(debugLabel: 'AdultLibrary.firstDecision');
  final FocusNode _firstCardFocus = FocusNode(debugLabel: 'AdultLibrary.firstCard');
  bool _restoreFocusAfterDecision = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _firstDecisionFocus.dispose();
    _firstCardFocus.dispose();
    super.dispose();
  }

  /// Decisions are a prompt, not the library: a failure here must never hide the grid.
  Future<List<AdultDecisionCandidate>?> _loadDecisions() async {
    try {
      final decisions = await widget.api.fetchAdultDecisions();
      if (!mounted) return null;
      setState(() {
        _decisions = decisions.items;
        _decisionsTotal = decisions.total;
      });
      return decisions.items;
    } catch (_) {
      return null;
    }
  }

  Future<void> _load({bool append = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    // Start both requests together: the decision strip must not delay the grid.
    final decisionsFuture = _loadDecisions();
    try {
      final page = await widget.api.getAdultItems(
        query: _searchController.text,
        page: _pageNumber,
        pageSize: widget.pageSize,
      );
      await decisionsFuture;
      if (!mounted) return;
      setState(() {
        // Titled items first, review bucket after: eight raw filenames at the top blocked discovery
        // (review finding). Order inside each group stays the server's.
        final sorted = [...page.items]..sort((a, b) {
            if (a.needsReview != b.needsReview) return a.needsReview ? 1 : -1;
            return 0;
          });
        final orderedPage = AdultItemsPage(
          items: sorted,
          page: page.page,
          pageSize: page.pageSize,
          totalCount: page.totalCount,
          needsReview: page.needsReview,
        );
        _page = append && _page != null
            ? AdultItemsPage(
                items: [..._page!.items, ...orderedPage.items],
                page: page.page,
                pageSize: page.pageSize,
                totalCount: page.totalCount,
                needsReview: page.needsReview,
              )
            : orderedPage;
      });
      _restoreFocus();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = 'Could not load the Adult library: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// After a decision the targeted control may be gone. Land on the next decision, else the grid:
  /// focus must never be left on a node that no longer renders a cue.
  void _restoreFocus() {
    if (!_restoreFocusAfterDecision) return;
    _restoreFocusAfterDecision = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_decisions.isNotEmpty) {
        _firstDecisionFocus.requestFocus();
      } else {
        _firstCardFocus.requestFocus();
      }
    });
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

  Future<void> _decide({
    required int id,
    required String title,
    required String decision,
  }) async {
    if (_deciding.contains(id)) return;
    // One confirmation, defaulting to Keep: delete physically purges the file.
    if (decision == 'delete' && !await confirmAdultDelete(context, title)) return;
    if (!mounted) return;
    setState(() => _deciding.add(id));
    try {
      final result = await widget.api.decideAdultItem(id, decision);
      if (!mounted) return;
      _restoreFocusAfterDecision = true;
      _showMessage(_decisionMessage(title, decision, result));
      await _load();
    } catch (error) {
      if (!mounted) return;
      _showMessage('Could not save the decision: $error', isError: true);
    } finally {
      if (mounted) setState(() => _deciding.remove(id));
    }
  }

  String _decisionMessage(String title, String decision, AdultDecisionResult result) {
    if (result.alreadyDecided) {
      return decision == 'delete' ? 'Already deleted: $title' : 'Already kept: $title';
    }
    return decision == 'delete'
        ? 'Deleted “$title” — file quarantined and purged'
        : 'Kept “$title”';
  }

  void _showMessage(String message, {bool isError = false}) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;
    messenger
      ..removeCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 4),
          backgroundColor: isError ? const Color(0xFF7F1D1D) : const Color(0xFF1F2937),
          content: Text(
            message,
            style: const TextStyle(color: Colors.white, fontSize: 16),
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final page = _page;
    final items = page?.items ?? const <AdultItem>[];
    final undecidedIds = {for (final candidate in _decisions) candidate.id};
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
                      '${(page?.needsReview ?? 0) > 0 ? ' · ${page!.needsReview} need review' : ''}'
                      '${_decisions.isNotEmpty ? ' · ${_decisions.length} need a decision' : ''}',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16),
                    ),
                  ),
                  // The shell draws the wall clock in the top-right corner; the
                  // search box must not sit under it (measured on the TV
                  // 2026-11-19: the clock covered the field's right edge).
                  const SizedBox(width: 150),
                  SizedBox(
                    width: 300,
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
              if (_decisions.isNotEmpty) _decisionsSection(),
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
                          mainAxisExtent: 250,
                        ),
                        itemCount: items.length,
                        itemBuilder: (context, index) => AdultItemCard(
                          item: items[index],
                          // The decision strip owns initial focus while it has items: it is the
                          // actionable part of the screen and its first Keep is a real control.
                          autofocus:
                              widget.autofocusFirst && _decisions.isEmpty && index == 0,
                          focusNode: index == 0 ? _firstCardFocus : null,
                          imageUrl: _thumbUrl(items[index]),
                          onFocused: () => _maybeLoadNext(index),
                          onSelect: () => widget.onSelect?.call(items[index]),
                          showDecisionActions:
                              undecidedIds.contains(items[index].id) && !items[index].keep,
                          deciding: _deciding.contains(items[index].id),
                          onKeep: () => _decide(
                            id: items[index].id,
                            title: items[index].displayTitle,
                            decision: 'keep',
                          ),
                          onDelete: () => _decide(
                            id: items[index].id,
                            title: items[index].displayTitle,
                            decision: 'delete',
                          ),
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

  Widget _decisionsSection() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.how_to_vote_outlined, color: Color(0xFFFBBF24), size: 20),
              const SizedBox(width: 8),
              const Text(
                'Needs a decision',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 10),
              Text(
                _decisionsTotal > _decisions.length
                    ? '${_decisions.length} of $_decisionsTotal watched'
                    : '${_decisions.length} watched',
                style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 124,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _decisions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final candidate = _decisions[index];
                return _DecisionTile(
                  candidate: candidate,
                  // Keep is the default focus: one stray Select must never delete a file.
                  autofocus: widget.autofocusFirst && index == 0,
                  focusNode: index == 0 ? _firstDecisionFocus : null,
                  busy: _deciding.contains(candidate.id),
                  onKeep: () => _decide(
                    id: candidate.id,
                    title: candidate.displayTitle,
                    decision: 'keep',
                  ),
                  onDelete: () => _decide(
                    id: candidate.id,
                    title: candidate.displayTitle,
                    decision: 'delete',
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// One watched-undecided item in the "Needs a decision" strip.
class _DecisionTile extends StatelessWidget {
  const _DecisionTile({
    required this.candidate,
    required this.autofocus,
    required this.busy,
    required this.onKeep,
    required this.onDelete,
    this.focusNode,
  });

  final AdultDecisionCandidate candidate;
  final bool autofocus;
  final bool busy;
  final VoidCallback onKeep;
  final VoidCallback onDelete;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 300,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF262635)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            candidate.displayTitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(
            _metaLine(candidate),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: _DecisionButton(
                  label: 'Keep',
                  icon: Icons.check,
                  color: const Color(0xFF86EFAC),
                  autofocus: autofocus,
                  focusNode: focusNode,
                  onSelect: busy ? null : onKeep,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _DecisionButton(
                  label: 'Delete',
                  icon: Icons.delete_outline,
                  color: const Color(0xFFFCA5A5),
                  onSelect: busy ? null : onDelete,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _metaLine(AdultDecisionCandidate candidate) {
    final parts = <String>[];
    if (candidate.subtitleLine.isNotEmpty) parts.add(candidate.subtitleLine);
    if (candidate.sizeBytes > 0) parts.add(_formatBytes(candidate.sizeBytes));
    final watched = candidate.lastPlayedAt;
    if (watched != null) parts.add('watched ${_relativeDay(watched)}');
    return parts.isEmpty ? 'watched' : parts.join(' · ');
  }

  static String _formatBytes(int bytes) {
    const gigabyte = 1024 * 1024 * 1024;
    if (bytes >= gigabyte) return '${(bytes / gigabyte).toStringAsFixed(1)} GB';
    return '${(bytes / (1024 * 1024)).round()} MB';
  }

  static String _relativeDay(DateTime watched) {
    final days = DateTime.now().difference(watched).inDays;
    if (days <= 0) return 'today';
    return '${days}d ago';
  }
}

/// A big D-pad target of the decisions strip (same white focus ring as every other control).
class _DecisionButton extends StatelessWidget {
  const _DecisionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onSelect,
    this.autofocus = false,
    this.focusNode,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onSelect;
  final bool autofocus;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      focusNode: focusNode,
      autofocus: autofocus,
      variant: FocusableActionVariant.button,
      borderRadius: 6,
      focusPadding: 2,
      onSelect: onSelect,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF1F2937),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withValues(alpha: 0.8)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
