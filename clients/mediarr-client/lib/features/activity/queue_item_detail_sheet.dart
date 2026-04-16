import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/services/api_client.dart';

class QueueItemDetailSheet extends ConsumerStatefulWidget {
  const QueueItemDetailSheet({super.key, required this.torrent});

  final TorrentItem torrent;

  @override
  ConsumerState<QueueItemDetailSheet> createState() =>
      _QueueItemDetailSheetState();
}

class _QueueItemDetailSheetState extends ConsumerState<QueueItemDetailSheet> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final torrent = widget.torrent;

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  torrent.name,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
                color: MediarrColors.textMuted,
              ),
            ],
          ),
          const SizedBox(height: 24),
          _DetailRow(label: 'Status', value: torrent.status),
          _DetailRow(label: 'Progress', value: '${torrent.progress.toStringAsFixed(1)}%'),
          _DetailRow(label: 'Size', value: torrent.formattedSize),
          _DetailRow(label: 'Download Speed', value: torrent.formattedSpeed),
          if (torrent.uploadSpeed > 0)
            _DetailRow(label: 'Upload Speed', value: '${torrent.uploadSpeed} B/s'),
          if (torrent.eta != null && !torrent.isCompleted)
            _DetailRow(label: 'ETA', value: torrent.formattedEta),
          if (torrent.ratio != null)
            _DetailRow(label: 'Ratio', value: torrent.ratio!.toStringAsFixed(3)),
          if (torrent.downloaded != null)
            _DetailRow(label: 'Downloaded', value: '${torrent.downloaded} B'),
          if (torrent.uploaded != null)
            _DetailRow(label: 'Uploaded', value: '${torrent.uploaded} B'),
          if (torrent.infoHash.isNotEmpty)
            _DetailRow(label: 'Hash', value: torrent.infoHash.substring(0, 8)),
          const SizedBox(height: 24),
          Row(
            children: [
              if (torrent.isDownloading || torrent.isPaused) ...[
                Expanded(
                  child: _ActionButton(
                    icon: torrent.isPaused ? Icons.play_arrow : Icons.pause,
                    label: torrent.isPaused ? 'Resume' : 'Pause',
                    color: MediarrColors.accentPrimary,
                    isLoading: _isLoading,
                    onPressed: () => _togglePause(torrent),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: _ActionButton(
                  icon: Icons.delete_outline,
                  label: 'Remove',
                  color: MediarrColors.statusError,
                  isLoading: _isLoading,
                  onPressed: () => _confirmRemove(torrent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Future<void> _togglePause(TorrentItem torrent) async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(apiClientProvider.notifier);
      if (torrent.isPaused) {
        await client.resumeTorrent(torrent.infoHash);
      } else {
        await client.pauseTorrent(torrent.infoHash);
      }
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to ${widget.torrent.isPaused ? 'resume' : 'pause'}: $e'),
            backgroundColor: MediarrColors.statusError,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _confirmRemove(TorrentItem torrent) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: MediarrColors.surfaceCard,
        title: const Text('Remove Torrent'),
        content: Text('Remove "${torrent.name}" from the queue?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: MediarrColors.statusError,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      try {
        final client = ref.read(apiClientProvider.notifier);
        await client.removeTorrent(torrent.infoHash);
        if (mounted) {
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to remove: $e'),
              backgroundColor: MediarrColors.statusError,
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    }
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                color: MediarrColors.textMuted,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: MediarrColors.textPrimary,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.isLoading,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final Color color;
  final bool isLoading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: isLoading ? null : onPressed,
      icon: isLoading
          ? SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: color,
              ),
            )
          : Icon(icon, size: 18),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withValues(alpha: 0.2),
        foregroundColor: color,
        padding: const EdgeInsets.symmetric(vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}
