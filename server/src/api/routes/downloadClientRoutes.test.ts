import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { registerDownloadClientRoutes } from './downloadClientRoutes';
import { registerApiErrorHandler } from '../errors';
import type { DownloadClientRepository } from '../../repositories/DownloadClientRepository';
import type { ApiDependencies } from '../types';

type MockDownloadClientRepository = {
  [K in keyof DownloadClientRepository]: ReturnType<typeof vi.fn>;
};

function createMockRepository(): MockDownloadClientRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByProtocol: vi.fn(),
    findEnabled: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    nameExists: vi.fn(),
  };
}

function createTestApp(mockRepo: MockDownloadClientRepository): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    downloadClientRepository: mockRepo as unknown as DownloadClientRepository,
  };
  
  // Register error handler before routes
  app.setErrorHandler((error, request, reply) => {
    return registerApiErrorHandler(request, reply, error);
  });
  
  registerDownloadClientRoutes(app, deps);
  return app;
}

describe('Download Client Routes', () => {
  let mockRepo: MockDownloadClientRepository;
  let app: FastifyInstance;

  beforeEach(() => {
    mockRepo = createMockRepository();
    app = createTestApp(mockRepo);
  });

  describe('GET /api/download-clients', () => {
    it('returns all download clients', async () => {
      const mockClients = [
        {
          id: 1,
          name: 'qBittorrent',
          protocol: 'torrent',
          type: 'qbittorrent',
          enabled: true,
          priority: 25,
          config: { host: 'localhost', port: 8080, useSsl: false },
          added: new Date(),
        },
      ];
      mockRepo.findAll.mockResolvedValue(mockClients);

      const response = await app.inject({
        method: 'GET',
        url: '/api/download-clients',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('qBittorrent');
    });
  });

  describe('GET /api/download-clients/:id', () => {
    it('returns a single download client', async () => {
      const mockClient = {
        id: 1,
        name: 'qBittorrent',
        protocol: 'torrent',
        type: 'qbittorrent',
        enabled: true,
        priority: 25,
        config: { host: 'localhost', port: 8080, useSsl: false },
        added: new Date(),
      };
      mockRepo.findById.mockResolvedValue(mockClient);

      const response = await app.inject({
        method: 'GET',
        url: '/api/download-clients/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.name).toBe('qBittorrent');
    });

    it('returns 404 when client not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/download-clients/999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/download-clients', () => {
    it('creates a new download client', async () => {
      mockRepo.nameExists.mockResolvedValue(false);
      mockRepo.create.mockResolvedValue({
        id: 1,
        name: 'qBittorrent',
        protocol: 'torrent',
        type: 'qbittorrent',
        enabled: true,
        priority: 25,
        config: { host: 'localhost', port: 8080, useSsl: false },
        added: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients',
        payload: {
          name: 'qBittorrent',
          protocol: 'torrent',
          type: 'qbittorrent',
          config: {
            host: 'localhost',
            port: 8080,
            useSsl: false,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.name).toBe('qBittorrent');
    });

    it('rejects duplicate names', async () => {
      mockRepo.nameExists.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients',
        payload: {
          name: 'qBittorrent',
          protocol: 'torrent',
          type: 'qbittorrent',
          config: {
            host: 'localhost',
            port: 8080,
            useSsl: false,
          },
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('rejects unknown client types', async () => {
      mockRepo.nameExists.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients',
        payload: {
          name: 'Unknown Client',
          protocol: 'torrent',
          type: 'unknown',
          config: {
            host: 'localhost',
            port: 8080,
            useSsl: false,
          },
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/download-clients/:id', () => {
    it('updates an existing download client', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 1,
        name: 'qBittorrent',
        protocol: 'torrent',
        type: 'qbittorrent',
        enabled: true,
        priority: 25,
        config: { host: 'localhost', port: 8080, useSsl: false },
        added: new Date(),
      });
      mockRepo.nameExists.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue({
        id: 1,
        name: 'qBittorrent Updated',
        protocol: 'torrent',
        type: 'qbittorrent',
        enabled: true,
        priority: 25,
        config: { host: 'localhost', port: 8080, useSsl: false },
        added: new Date(),
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/download-clients/1',
        payload: {
          name: 'qBittorrent Updated',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.name).toBe('qBittorrent Updated');
    });

    it('returns 404 when updating non-existent client', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/download-clients/999',
        payload: {
          name: 'Updated',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/download-clients/:id', () => {
    it('deletes a download client', async () => {
      mockRepo.exists.mockResolvedValue(true);
      mockRepo.delete.mockResolvedValue({
        id: 1,
        name: 'qBittorrent',
        protocol: 'torrent',
        type: 'qbittorrent',
        enabled: true,
        priority: 25,
        config: { host: 'localhost', port: 8080, useSsl: false },
        added: new Date(),
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/download-clients/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
    });

    it('returns 404 when deleting non-existent client', async () => {
      mockRepo.exists.mockResolvedValue(false);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/download-clients/999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/download-clients/:id/test', () => {
    it('tests an existing client connection', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 1,
        name: 'qBittorrent',
        protocol: 'torrent',
        type: 'qbittorrent',
        enabled: true,
        priority: 25,
        config: { host: 'localhost', port: 8080, useSsl: false },
        added: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients/1/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.success).toBe(true);
    });

    it('returns 404 when testing non-existent client', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients/999/test',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/download-clients/test', () => {
    it('tests a new client config without saving', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients/test',
        payload: {
          type: 'qbittorrent',
          config: {
            host: 'localhost',
            port: 8080,
            useSsl: false,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.success).toBe(true);
    });
  });

  describe('POST /api/download-clients/schema', () => {
    it('returns all schemas when no type specified', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients/schema',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('returns schema for specific type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients/schema',
        payload: {
          type: 'qbittorrent',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
      expect(body.data.type).toBe('qbittorrent');
      expect(body.data.protocol).toBe('torrent');
      expect(Array.isArray(body.data.fields)).toBe(true);
    });

    it('returns error for unknown type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/download-clients/schema',
        payload: {
          type: 'unknown',
        },
      });

      expect(response.statusCode).toBe(422);
    });
  });
});
