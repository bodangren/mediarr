import { Bonjour } from 'bonjour-service';

interface BonjourPublication {
  start?: () => void;
  stop?: () => void;
}

interface BonjourInstance {
  publish: (options: {
    name: string;
    type: string;
    protocol: 'tcp' | 'udp';
    port: number;
    host?: string;
    txt?: Record<string, string>;
  }) => BonjourPublication;
  unpublishAll: (callback?: () => void) => void;
  destroy: () => void;
}

export interface DiscoveryServiceOptions {
  name?: string | undefined;
  type?: string | undefined;
  aliases?: string[] | undefined;
  port: number;
  host?: string | undefined; // explicit hostname to advertise
  txt?: Record<string, string> | undefined;
}

export interface DiscoveryAnnouncement {
  name: string;
  type: string;
  aliases?: string[] | undefined;
  port: number;
  host?: string | undefined;
  txt?: Record<string, string> | undefined;
}

export type BonjourFactory = () => BonjourInstance;

const DEFAULT_SERVICE_NAME = 'Mediarr';
const DEFAULT_SERVICE_TYPE = 'mediarr';
const IPV4_ADDRESS_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * Broadcasts Mediarr presence over mDNS so local clients can discover the API.
 */
export class DiscoveryService {
  private bonjour?: BonjourInstance | undefined;
  private publications: BonjourPublication[] = [];
  private announcement?: DiscoveryAnnouncement | undefined;

  constructor(private readonly bonjourFactory: BonjourFactory = () => new Bonjour() as unknown as BonjourInstance) {}

  isStarted(): boolean {
    return Boolean(this.bonjour && this.publications.length > 0 && this.announcement);
  }

  getAnnouncement(): DiscoveryAnnouncement | null {
    return this.announcement ?? null;
  }

  start(options: DiscoveryServiceOptions): DiscoveryAnnouncement {
    if (this.isStarted()) {
      return this.announcement!;
    }

    if (!Number.isInteger(options.port) || options.port <= 0) {
      throw new Error('DiscoveryService port must be a positive integer');
    }

    const serviceName = options.name?.trim() || DEFAULT_SERVICE_NAME;
    const serviceType = options.type?.trim() || DEFAULT_SERVICE_TYPE;
    // bonjour-service uses host as the SRV target, which must be a hostname.
    // It already publishes A records for each active non-loopback interface.
    const advertisedHost = options.host && !IPV4_ADDRESS_PATTERN.test(options.host)
      ? options.host
      : undefined;
    const aliasTypes = Array.from(
      new Set(
        (options.aliases ?? ['http'])
          .map(alias => alias.trim())
          .filter(alias => alias.length > 0 && alias !== serviceType),
      ),
    );

    console.log('[DIAG:DiscoveryService] starting mDNS broadcast: name=%j type=%j port=%d host=%j aliases=%j txt=%j',
       serviceName, serviceType, options.port, advertisedHost ?? '(auto)', aliasTypes, options.txt);

    const bonjour = this.bonjourFactory();
    const publications: BonjourPublication[] = [];

    const primaryPublication = bonjour.publish({
      name: serviceName,
      type: serviceType,
      protocol: 'tcp',
      port: options.port,
       ...(advertisedHost ? { host: advertisedHost } : {}),
      ...(options.txt ? { txt: options.txt } : {}),
    });
    publications.push(primaryPublication);

    for (const aliasType of aliasTypes) {
      const aliasPublication = bonjour.publish({
        name: serviceName,
        type: aliasType,
        protocol: 'tcp',
        port: options.port,
         ...(advertisedHost ? { host: advertisedHost } : {}),
        ...(options.txt ? { txt: options.txt } : {}),
      });
      publications.push(aliasPublication);
    }

    for (const publication of publications) {
      publication.start?.();
    }

    this.bonjour = bonjour;
    this.publications = publications;
    this.announcement = {
      name: serviceName,
      type: serviceType,
      ...(aliasTypes.length > 0 ? { aliases: aliasTypes } : {}),
      port: options.port,
       ...(advertisedHost ? { host: advertisedHost } : {}),
      ...(options.txt ? { txt: options.txt } : {}),
    };

    return this.announcement;
  }

  async stop(): Promise<void> {
    const publications = this.publications;
    const bonjour = this.bonjour;

    this.publications = [];
    this.bonjour = undefined;
    this.announcement = undefined;

    for (const publication of publications) {
      publication?.stop?.();
    }

    if (!bonjour) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      try {
        bonjour.unpublishAll(done);
        setTimeout(done, 100);
      } catch {
        done();
      }
    });

    bonjour.destroy();
  }
}
