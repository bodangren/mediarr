import { describe, expect, it } from 'vitest';
import { encodeJellyfinDiscoveryReply, isJellyfinDiscoveryProbe, resolveLanAddress } from './JellyfinDiscoveryService';

describe('JellyfinDiscoveryService protocol helpers', () => {
  it('accepts only Jellyfin discovery probes and emits the protocol-shaped response', () => {
    expect(isJellyfinDiscoveryProbe(Buffer.from('Who is JellyfinServer?'))).toBe(true);
    expect(isJellyfinDiscoveryProbe(Buffer.from('Who is something else?'))).toBe(false);
    expect(JSON.parse(encodeJellyfinDiscoveryReply({ address: 'http://192.168.1.9:8096', id: 'abc', name: 'Mediarr' }).toString())).toEqual({
      Address: 'http://192.168.1.9:8096', Id: 'abc', Name: 'Mediarr',
    });
  });

  it('never resolves loopback as the advertised address', () => {
    expect(resolveLanAddress({ lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true, netmask: '', cidr: null, mac: '' }], eth0: [{ address: '192.168.2.5', family: 'IPv4', internal: false, netmask: '', cidr: null, mac: '' }] } as any)).toBe('192.168.2.5');
  });
});
