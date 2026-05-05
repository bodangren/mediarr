import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ProviderUnavailableError } from '../../errors/domainErrors';
import { UpdateService } from './UpdateService';

function releasePayload(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    tag_name: 'v1.1.0',
    body: 'sha256: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    published_at: '2026-04-09T00:00:00.000Z',
    assets: [
      {
        name: 'mediarr-linux-x64',
        browser_download_url: 'https://example.com/mediarr-linux-x64',
        size: 1024,
        content_type: 'application/octet-stream',
      },
    ],
    ...overrides,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function streamResponse(bytes: Uint8Array, status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  return new Response(stream, {
    status,
    headers: {
      'content-length': String(bytes.byteLength),
      'content-type': 'application/octet-stream',
    },
  });
}

describe('UpdateService', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-update-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('checks GitHub releases and caches latest when newer version exists', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(releasePayload()));
    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    const result = await service.checkForUpdate();

    expect(result.updateAvailable).toBe(true);
    expect(result.release?.version).toBe('1.1.0');
    expect(service.getLatestRelease()?.version).toBe('1.1.0');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.github.com/repos/test/mediarr/releases/latest',
      expect.any(Object),
    );
  });

  it('returns updateAvailable=false and clears cache when already up-to-date', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(releasePayload({ tag_name: 'v1.0.0' })));
    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    const result = await service.checkForUpdate();

    expect(result.updateAvailable).toBe(false);
    expect(result.release).toBeNull();
    expect(service.getLatestRelease()).toBeNull();
  });

  it('throws ProviderUnavailableError on GitHub rate-limit responses', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ message: 'rate limited' }, 403));
    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    await expect(service.checkForUpdate()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('detects docker mode via injected detector', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(releasePayload()));
    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => true,
    });

    const result = await service.checkForUpdate();
    expect(result.isDocker).toBe(true);
  });

  it('downloads and verifies update binary with progress tracking', async () => {
    const bytes = Buffer.from('fake-update-binary');
    const checksum = createHash('sha256').update(bytes).digest('hex');

    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => jsonResponse(releasePayload({ body: `sha256: ${checksum}` })))
      .mockImplementationOnce(async () => streamResponse(bytes));

    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    await service.checkForUpdate();
    const progress = await service.downloadUpdate({ version: '1.1.0' });

    expect(progress.status).toBe('completed');
    expect(progress.progress).toBe(100);
    expect(progress.stagedPath).toBeTruthy();

    const stagedBytes = await fs.readFile(progress.stagedPath!);
    expect(Buffer.compare(stagedBytes, bytes)).toBe(0);

    const live = service.getProgress(progress.updateId);
    expect(live?.status).toBe('completed');
    expect(live?.bytesDownloaded).toBe(bytes.byteLength);
  });

  it('fails download when checksum does not match', async () => {
    const bytes = Buffer.from('corrupted-binary');
    const checksum = createHash('sha256').update(Buffer.from('valid-binary')).digest('hex');

    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => jsonResponse(releasePayload({ body: `sha256: ${checksum}` })))
      .mockImplementationOnce(async () => streamResponse(bytes));

    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    await service.checkForUpdate();

    await expect(service.downloadUpdate({ version: '1.1.0' })).rejects.toThrow('Checksum verification failed');
  });

  it('fails download when release asset request fails', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => jsonResponse(releasePayload()))
      .mockImplementationOnce(async () => new Response('boom', { status: 500 }));

    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    await service.checkForUpdate();

    await expect(service.downloadUpdate({ version: '1.1.0' })).rejects.toThrow('Failed to download release asset');
  });

  it('returns docker restart advisory in docker mode install', async () => {
    const service = new UpdateService({
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => true,
    });

    const result = await service.installUpdate({ version: '1.1.0' });

    expect(result.mode).toBe('docker');
    expect(result.status).toBe('restart_required');
    expect(result.command).toContain('docker pull');
  });

  it('replaces current executable in binary mode', async () => {
    const bytes = Buffer.from('binary-v1.1.0');
    const checksum = createHash('sha256').update(bytes).digest('hex');

    const currentExecutablePath = path.join(tempRoot, 'mediarr-current');
    await fs.writeFile(currentExecutablePath, 'old-binary');

    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => jsonResponse(releasePayload({ body: `sha256: ${checksum}` })))
      .mockImplementationOnce(async () => streamResponse(bytes));

    const service = new UpdateService({
      fetchFn: fetchFn as any,
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      currentExecutablePath,
      isDockerFn: () => false,
    });

    await service.checkForUpdate();
    const download = await service.downloadUpdate({ version: '1.1.0' });
    const result = await service.installUpdate({ updateId: download.updateId });

    expect(result.mode).toBe('binary');
    expect(result.status).toBe('installed');

    const replaced = await fs.readFile(currentExecutablePath);
    expect(Buffer.compare(replaced, bytes)).toBe(0);
  });

  it('throws NotFoundError when install is requested without a staged artifact', async () => {
    const service = new UpdateService({
      currentVersion: '1.0.0',
      githubRepo: 'test/mediarr',
      stagingDir: tempRoot,
      isDockerFn: () => false,
    });

    await expect(service.installUpdate({ version: '1.1.0' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
