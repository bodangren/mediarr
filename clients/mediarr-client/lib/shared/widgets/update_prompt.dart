import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/services/api_client.dart';
import '../../shared/services/update_service.dart';

const int kUpdateCountdownSeconds =
    int.fromEnvironment('UPDATE_COUNTDOWN_SECONDS', defaultValue: 30);
const MethodChannel _installChannel = MethodChannel('mediarr/update');

/// Checks for a published client update and shows the owner prompt:
/// "Update now" / "Wait 12 hours", with a countdown that auto-updates.
Future<void> checkForClientUpdate(BuildContext context, WidgetRef ref) async {
  final client = ref.read(apiClientProvider.notifier);
  final service = UpdateService(client);
  final info = await service.pendingUpdate();
  if (info == null || !context.mounted) return;

  var remaining = kUpdateCountdownSeconds;
  Timer? countdown;
  var downloading = false;
  var progress = 0.0;

  await showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) {
      return StatefulBuilder(
        builder: (context, setState) {
          Future<void> startUpdate() async {
            if (downloading) return;
            countdown?.cancel();
            setState(() {
              downloading = true;
              progress = 0;
            });
            try {
              final path = await service.download(
                info,
                onProgress: (received, total) {
                  if (total > 0) {
                    setState(() => progress = received / total);
                  }
                },
              );
              await _installChannel.invokeMethod<void>('installApk', {'path': path});
              if (dialogContext.mounted) Navigator.of(dialogContext).pop();
            } catch (error) {
              if (!dialogContext.mounted) return;
              setState(() {
                downloading = false;
                remaining = 0;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Update failed: $error')),
              );
            }
          }

          countdown ??= Timer.periodic(const Duration(seconds: 1), (timer) {
            if (!dialogContext.mounted || downloading) {
              timer.cancel();
              return;
            }
            if (remaining <= 1) {
              timer.cancel();
              startUpdate();
            } else {
              setState(() => remaining -= 1);
            }
          });

          return AlertDialog(
            title: Text('Mediarr ${info.versionName} available'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (info.notes.isNotEmpty) ...[
                  Text(info.notes),
                  const SizedBox(height: 8),
                ],
                if (downloading)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Downloading update…'),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(value: progress == 0 ? null : progress),
                    ],
                  )
                else
                  Text('Updating automatically in $remaining s.'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: downloading
                    ? null
                    : () async {
                        countdown?.cancel();
                        await service.snooze();
                        if (dialogContext.mounted) Navigator.of(dialogContext).pop();
                      },
                child: const Text('Wait 12 hours'),
              ),
              FilledButton(
                onPressed: downloading ? null : startUpdate,
                child: const Text('Update now'),
              ),
            ],
          );
        },
      );
    },
  );
  countdown?.cancel();
}
