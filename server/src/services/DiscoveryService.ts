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
  name?: string;
  type?: string;
  aliases?: string[];
  port: number;
  host?: string; // explicit LAN IP to advertise; avoids hostname→loopback resolution
  txt?: Record<string, string>;
}

export interface DiscoveryAnnouncement {
  name: string;
  type: string;
  aliases?: string[];
  port: number;
  host?: string;
  txt?: Record<string, string>;
}

export type BonjourFactory = () => BonjourInstance;

const DEFAULT_SERVICE_NAME = 'Mediarr';
const DEFAULT_SERVICE_TYPE = 'mediarr';

/**
 * Broadcasts Mediarr presence over mDNS so local clients can discover the API.
 */
export class DiscoveryService {
  private bonjour?: BonjourInstance;
  private publications: BonjourPublication[] = [];
  private announcement?: DiscoveryAnnouncement;

  constructor(private readonly bonjourFactory: BonjourFactory = () => new Bonjour() as BonjourInstance) {}

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
    const aliasTypes = Array.from(
      new Set(
        (options.aliases ?? ['http'])
          .map(alias => alias.trim())
          .filter(alias => alias.length > 0 && alias !== serviceType),
      ),
    );

    const bonjour = this.bonjourFactory();
    const publications: BonjourPublication[] = [];

    const primaryPublication = bonjour.publish({
      name: serviceName,
      type: serviceType,
      protocol: 'tcp',
      port: options.port,
      ...(options.host ? { host: options.host } : {}),
      ...(options.txt ? { txt: options.txt } : {}),
    });
    publications.push(primaryPublication);

    for (const aliasType of aliasTypes) {
      const aliasPublication = bonjour.publish({
        name: serviceName,
        type: aliasType,
        protocol: 'tcp',
        port: options.port,
        ...(options.host ? { host: options.host } : {}),
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
      ...(options.host ? { host: options.host } : {}),
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
