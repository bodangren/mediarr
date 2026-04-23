import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/services/api_client.dart';

final calendarProvider = FutureProvider.family<Map<String, List<UpcomingItem>>, (int, int)>((ref, params) async {
  final (year, month) = params;
  final client = ref.read(apiClientProvider.notifier);
  return client.getCalendarData(year, month);
});

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _focusedMonth;

  @override
  void initState() {
    super.initState();
    _focusedMonth = DateTime.now();
  }

  void _previousMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final calendarAsync = ref.watch(calendarProvider((_focusedMonth.year, _focusedMonth.month)));

    return Scaffold(
      backgroundColor: MediarrColors.surfaceBase,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Calendar',
                    style: TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: _previousMonth,
                        icon: const Icon(Icons.chevron_left, color: MediarrColors.textSecondary),
                      ),
                      Text(
                        '${_monthName(_focusedMonth.month)} ${_focusedMonth.year}',
                        style: const TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      IconButton(
                        onPressed: _nextMonth,
                        icon: const Icon(Icons.chevron_right, color: MediarrColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: calendarAsync.when(
                data: (calendarData) => _CalendarGrid(
                  focusedMonth: _focusedMonth,
                  calendarData: calendarData,
                ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(
                  child: Text(
                    'Error: $err',
                    style: const TextStyle(color: MediarrColors.statusError),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _monthName(int month) {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[month - 1];
  }
}

class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.focusedMonth,
    required this.calendarData,
  });

  final DateTime focusedMonth;
  final Map<String, List<UpcomingItem>> calendarData;

  @override
  Widget build(BuildContext context) {
    final daysInMonth = DateTime(focusedMonth.year, focusedMonth.month + 1, 0).day;
    final firstWeekday = DateTime(focusedMonth.year, focusedMonth.month, 1).weekday % 7;

    return Column(
      children: [
        // Weekday headers
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: const [
              Text('Sun', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
              Text('Mon', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
              Text('Tue', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
              Text('Wed', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
              Text('Thu', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
              Text('Fri', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
              Text('Sat', style: TextStyle(color: MediarrColors.textMuted, fontSize: 12)),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1.0,
            ),
            itemCount: firstWeekday + daysInMonth,
            itemBuilder: (context, index) {
              if (index < firstWeekday) {
                return const SizedBox.shrink();
              }
              final day = index - firstWeekday + 1;
              final dateStr = '${focusedMonth.year}-${focusedMonth.month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
              final items = calendarData[dateStr] ?? [];
              final hasReleases = items.isNotEmpty;

              return _CalendarDayCell(
                day: day,
                hasReleases: hasReleases,
                items: items,
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CalendarDayCell extends StatefulWidget {
  const _CalendarDayCell({
    required this.day,
    required this.hasReleases,
    required this.items,
  });

  final int day;
  final bool hasReleases;
  final List<UpcomingItem> items;

  @override
  State<_CalendarDayCell> createState() => _CalendarDayCellState();
}

class _CalendarDayCellState extends State<_CalendarDayCell> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return FocusableActionDetector(
      onFocusChange: (focused) {
        setState(() {
          _focused = focused;
        });
      },
      child: GestureDetector(
        onTap: widget.hasReleases
            ? () => _showDayReleases(context, widget.items)
            : null,
        child: Container(
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: _focused ? MediarrColors.surfaceHover : MediarrColors.surfaceCard,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _focused ? MediarrColors.focusRing : MediarrColors.borderSubtle,
              width: _focused ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${widget.day}',
                style: TextStyle(
                  color: _focused ? MediarrColors.textPrimary : MediarrColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (widget.hasReleases)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: MediarrColors.accentPrimary,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDayReleases(BuildContext context, List<UpcomingItem> items) {
    showModalBottomSheet(
      context: context,
      backgroundColor: MediarrColors.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${items.first.date} — ${items.length} release${items.length > 1 ? 's' : ''}',
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 16),
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.of(context).size.height * 0.4,
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const Divider(color: MediarrColors.borderSubtle),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          item.title,
                          style: const TextStyle(
                            color: MediarrColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(
                          item.type == 'episode'
                              ? 'S${item.seasonNumber}E${item.episodeNumber}${item.episodeTitle != null ? ' — ${item.episodeTitle}' : ''}'
                              : 'Movie',
                          style: const TextStyle(color: MediarrColors.textMuted),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: item.status == 'downloaded'
                                ? MediarrColors.statusSuccess.withOpacity(0.2)
                                : MediarrColors.statusWarning.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.status ?? 'unknown',
                            style: TextStyle(
                              color: item.status == 'downloaded'
                                  ? MediarrColors.statusSuccess
                                  : MediarrColors.statusWarning,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
