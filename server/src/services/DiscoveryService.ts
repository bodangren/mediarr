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
    txt?: Record<string, string>;
  }) => BonjourPublication;
  unpublishAll: (callback?: () => void) => void;
  destroy: () => void;
}

export interface DiscoveryServiceOptions {
  name?: string;
  type?: string;
  port: number;
  txt?: Record<string, string>;
}

export interface DiscoveryAnnouncement {
  name: string;
  type: string;
  port: number;
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
  private publication?: BonjourPublication;
  private announcement?: DiscoveryAnnouncement;

  constructor(private readonly bonjourFactory: BonjourFactory = () => new Bonjour() as BonjourInstance) {}

  isStarted(): boolean {
    return Boolean(this.bonjour && this.publication && this.announcement);
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

    const bonjour = this.bonjourFactory();
    const publication = bonjour.publish({
      name: serviceName,
      type: serviceType,
      protocol: 'tcp',
      port: options.port,
      ...(options.txt ? { txt: options.txt } : {}),
    });

    publication.start?.();

    this.bonjour = bonjour;
    this.publication = publication;
    this.announcement = {
      name: serviceName,
      type: serviceType,
      port: options.port,
      ...(options.txt ? { txt: options.txt } : {}),
    };

    return this.announcement;
  }

  async stop(): Promise<void> {
    const publication = this.publication;
    const bonjour = this.bonjour;

    this.publication = undefined;
    this.bonjour = undefined;
    this.announcement = undefined;

    publication?.stop?.();

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
