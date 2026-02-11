import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mock TorrentManager and TorrentRepository
 */
function createMockManager() {
  return {
    getClient: vi.fn().mockReturnValue({
      torrents: []
    }),
    removeTorrent: vi.fn().mockResolvedValue(undefined),
    pauseTorrent: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockRepository() {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue({}),
  };
}

// We'll import SeedingProtector after we define it in the implement phase, 
// but for TDD we can imagine its interface.
// For now, let's assume it takes a Manager and a Repository.

describe('SeedingProtector', () => {
  let protector;
  let mockManager;
  let mockRepo;

  beforeEach(async () => {
    vi.useFakeTimers();
    mockManager = createMockManager();
    mockRepo = createMockRepository();
    
    // In actual implementation, we'll import this.
    // For TDD "Red" phase, we can mock the import or just wait until we create the file.
    // Since I'm an agent, I'll create a placeholder if it doesn't exist to make it fail properly.
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should stop torrent when ratio limit is reached', async () => {
    const { SeedingProtector } = await import('../server/src/services/SeedingProtector');
    protector = new SeedingProtector(mockManager, mockRepo);

    const torrents = [
      {
        infoHash: 'abc',
        status: 'seeding',
        ratio: 1.5,
        stopAtRatio: 1.0,
        completedAt: new Date(Date.now() - 3600000), // 1 hour ago
      }
    ];

    mockRepo.findAll.mockResolvedValue(torrents);

    await protector.checkLimits();

    expect(mockManager.removeTorrent).toHaveBeenCalledWith('abc');
  });

  it('should stop torrent when time limit is reached', async () => {
    const { SeedingProtector } = await import('../server/src/services/SeedingProtector');
    protector = new SeedingProtector(mockManager, mockRepo);

    const torrents = [
      {
        infoHash: 'def',
        status: 'seeding',
        ratio: 0.5,
        stopAtRatio: null,
        stopAtTime: 60, // 60 minutes
        completedAt: new Date(Date.now() - 70 * 60 * 1000), // 70 minutes ago
      }
    ];

    mockRepo.findAll.mockResolvedValue(torrents);

    await protector.checkLimits();

    expect(mockManager.removeTorrent).toHaveBeenCalledWith('def');
  });

  it('should not stop torrent if limits are not reached', async () => {
    const { SeedingProtector } = await import('../server/src/services/SeedingProtector');
    protector = new SeedingProtector(mockManager, mockRepo);

    const torrents = [
      {
        infoHash: 'ghi',
        status: 'seeding',
        ratio: 0.5,
        stopAtRatio: 1.0,
        stopAtTime: 120,
        completedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      }
    ];

    mockRepo.findAll.mockResolvedValue(torrents);

    await protector.checkLimits();

    expect(mockManager.removeTorrent).not.toHaveBeenCalled();
  });

  it('should run checks periodically', async () => {
    const { SeedingProtector } = await import('../server/src/services/SeedingProtector');
    protector = new SeedingProtector(mockManager, mockRepo);
    
    protector.start(60000); // Check every minute

    vi.advanceTimersByTime(65000);

    expect(mockRepo.findAll).toHaveBeenCalled();
  });
});
