import 'dart:async';

import 'package:bonsoir/bonsoir.dart';

import 'discovery_service.dart';

class BonsoirMdnsAdapter implements MdnsDiscoveryAdapter {
  BonsoirDiscovery? _discovery;
  final _controller = StreamController<DiscoveredServer>.broadcast();
  bool _started = false;

  @override
  Stream<DiscoveredServer> get onServerFound => _controller.stream;

  @override
  Future<void> startDiscovery() async {
    if (_started) return;
    _started = true;

    _discovery = BonsoirDiscovery(type: '_mediarr._tcp');
    await _discovery!.ready;

    _discovery!.eventStream?.listen((event) {
      if (event.type == BonsoirDiscoveryEventType.discoveryServiceFound) {
        final service = event.service;
        if (service != null) {
          final host = service is ResolvedBonsoirService ? service.host : null;
          _controller.add(DiscoveredServer(
            name: service.name,
            host: host ?? '',
            port: service.port,
          ));
        }
      }
    });

    await _discovery!.start();
  }

  @override
  Future<void> stopDiscovery() async {
    if (!_started) return;
    _started = false;
    await _discovery?.stop();
    _discovery = null;
  }
}
