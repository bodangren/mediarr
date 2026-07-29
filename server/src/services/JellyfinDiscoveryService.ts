import * as dgram from 'node:dgram';
import os from 'node:os';

const PROBE = 'Who is JellyfinServer?';

export interface JellyfinDiscoveryAnnouncement { address: string; id: string; name: string; }
export type JellyfinSocket = Pick<dgram.Socket, 'bind' | 'close' | 'send' | 'on' | 'once'>;
export type JellyfinSocketFactory = () => JellyfinSocket;

export function isJellyfinDiscoveryProbe(message: Buffer): boolean {
  return message.toString('utf8').trim() === PROBE;
}

export function encodeJellyfinDiscoveryReply(announcement: JellyfinDiscoveryAnnouncement): Buffer {
  return Buffer.from(JSON.stringify({ Address: announcement.address, Id: announcement.id, Name: announcement.name }));
}

export function resolveLanAddress(networks = os.networkInterfaces()): string | null {
  for (const entries of Object.values(networks)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && entry.address !== '127.0.0.1') return entry.address;
    }
  }
  return null;
}

/** Raw UDP 7359 responder; intentionally separate from Bonjour's mDNS publisher. */
export class JellyfinDiscoveryService {
  private socket: JellyfinSocket | undefined;
  constructor(private readonly socketFactory: JellyfinSocketFactory = () => dgram.createSocket({ type: 'udp4', reuseAddr: true }), private readonly lanAddress = resolveLanAddress) {}
  get started(): boolean { return Boolean(this.socket); }
  async start(port: number, id: string, name: string): Promise<void> {
    if (this.socket) return;
    const lanIp = this.lanAddress();
    if (!lanIp) throw new Error('Jellyfin discovery requires a non-loopback IPv4 LAN address');
    const socket = this.socketFactory();
    socket.on('message', (message: Buffer, remote: dgram.RemoteInfo) => {
      if (isJellyfinDiscoveryProbe(message)) void socket.send(encodeJellyfinDiscoveryReply({ address: `http://${lanIp}:${port}`, id, name }), remote.port, remote.address);
    });
    await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.bind(7359, '0.0.0.0', () => resolve()); });
    this.socket = socket;
  }
  async stop(): Promise<void> {
    const socket = this.socket;
    this.socket = undefined;
    if (socket) await new Promise<void>(resolve => socket.close(() => resolve()));
  }
}
