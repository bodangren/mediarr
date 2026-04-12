import 'dart:async';
import 'dart:io';

import 'package:multicast_dns/multicast_dns.dart';

/// Discovered server address.
class ServerAddress {
  const ServerAddress({required this.host, required this.port});
  final String host;
  final int port;
  String get baseUrl => 'http://$host:$port';
}

/// Attempt mDNS discovery of _mediarr._tcp.
/// Returns on the first host found, or throws [TimeoutException] after [timeout].
Future<ServerAddress> discoverViaMulticast({
  Duration timeout = const Duration(seconds: 10),
}) async {
  const serviceType = '_mediarr._tcp';
  final completer = Completer<ServerAddress>();
  final client = MDnsClient();

  await client.start();

  // PTR → SRV → A
  final ptrStream = client.lookup<PtrResourceRecord>(
    ResourceRecordQuery.serverPointer(serviceType),
  );

  ptrStream.listen((PtrResourceRecord ptr) async {
    if (completer.isCompleted) return;

    // Resolve the SRV record for this PTR
    final srvStream = client.lookup<SrvResourceRecord>(
      ResourceRecordQuery.service(ptr.domainName),
    );

    await for (final SrvResourceRecord srv in srvStream) {
      if (completer.isCompleted) break;

      // Resolve the A record for the target host
      final ipStream = client.lookup<IPAddressResourceRecord>(
        ResourceRecordQuery.addressIPv4(srv.target),
      );

      await for (final IPAddressResourceRecord ip in ipStream) {
        if (completer.isCompleted) break;
        completer.complete(
          ServerAddress(host: ip.address.address, port: srv.port),
        );
        break;
      }
      break;
    }
  });

  try {
    return await completer.future.timeout(timeout);
  } finally {
    client.stop();
  }
}

/// Fall back to a direct URL provided via environment.
/// Returns null if not set.
ServerAddress? directAddressFromEnv() {
  final raw = Platform.environment['MEDIARR_DIRECT_URL'];
  if (raw == null || raw.isEmpty) return null;
  final uri = Uri.parse(raw);
  return ServerAddress(
    host: uri.host.isEmpty ? '127.0.0.1' : uri.host,
    port: uri.port == 0 ? 8080 : uri.port,
  );
}
