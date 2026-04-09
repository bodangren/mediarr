import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';

/// A generic grid layout for media poster cards with search/filter bar.
class MediaGrid extends StatelessWidget {
  const MediaGrid({
    super.key,
    required this.title,
    required this.itemCount,
    required this.itemBuilder,
    this.searchController,
    this.onSearchChanged,
    this.filterWidget,
    this.topSection,
    this.isLoading = false,
    this.isEmpty = false,
    this.emptyMessage = 'No items found',
  });

  final String title;
  final int itemCount;
  final Widget Function(BuildContext context, int index) itemBuilder;
  final TextEditingController? searchController;
  final ValueChanged<String>? onSearchChanged;
  final Widget? filterWidget;
  final Widget? topSection;
  final bool isLoading;
  final bool isEmpty;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with title and search
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              const Spacer(),
              if (searchController != null)
                SizedBox(
                  width: 300,
                  child: TextField(
                    controller: searchController,
                    onChanged: onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Search...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: MediarrColors.surfaceCard,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      isDense: true,
                    ),
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                ),
              if (filterWidget != null) ...[
                const SizedBox(width: 12),
                filterWidget!,
              ],
            ],
          ),
        ),

        // Content
        Expanded(
          child: isLoading
              ? const Center(
                  child: CircularProgressIndicator(
                    color: MediarrColors.accentPrimary,
                  ),
                )
                  : isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.inbox,
                            color: MediarrColors.textMuted,
                            size: 64,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            emptyMessage,
                            style: const TextStyle(
                              color: MediarrColors.textMuted,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    )
                  : Column(
                      children: [
                        if (topSection != null) topSection!,
                        Expanded(
                          child: GridView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            gridDelegate:
                                const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 200,
                              childAspectRatio: 0.6,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                            ),
                            itemCount: itemCount,
                            itemBuilder: itemBuilder,
                          ),
                        ),
                      ],
                    ),
        ),
      ],
    );
  }
}
