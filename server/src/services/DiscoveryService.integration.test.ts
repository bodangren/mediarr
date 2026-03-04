import { describe, expect, it } from 'vitest';
import { DiscoveryService } from './DiscoveryService';

describe('DiscoveryService integration', () => {
  it('publishes and stops an mDNS service on the local interface', async () => {
    const service = new DiscoveryService();

    const announcement = service.start({
      port: 3100,
      name: 'Mediarr Integration',
      type: 'mediarr',
    });

    expect(announcement.type).toBe('mediarr');
    expect(announcement.port).toBe(3100);
    expect(service.isStarted()).toBe(true);

    await service.stop();
    expect(service.isStarted()).toBe(false);
  });
});
