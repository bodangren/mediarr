import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  NotFoundError,
  ProviderUnavailableError,
  ValidationError,
} from '../../errors/domainErrors';

export type UpdateBranch = 'master' | 'develop' | 'phantom' | 'stable';

interface GitHubReleaseAsset {
  name?: unknown;
  browser_download_url?: unknown;
  size?: unknown;
  content_type?: unknown;
}

interface GitHubRelease {
  tag_name?: unknown;
  body?: unknown;
  published_at?: unknown;
  assets?: unknown;
  prerelease?: unknown;
}

export interface AvailableUpdateInfo {
  version: string;
  tagName: string;
  changelog: string;
  publishedAt: string;
  downloadUrl: string;
  assetName: string;
  assetContentType: string;
  expectedChecksum: string | null;
}

export interface CheckForUpdateResult {
  checkedAt: string;
  currentVersion: string;
  updateAvailable: boolean;
  isDocker: boolean;
  release: AvailableUpdateInfo | null;
}

export type UpdateProgressStatus =
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'completed'
  | 'failed';

export interface UpdateProgressEntry {
  updateId: string;
  version: string;
  status: UpdateProgressStatus;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number | null;
  message: string;
  startedAt: string;
  completedAt?: string;
  stagedPath?: string;
  error?: string;
}

export type UpdateHistoryStatus = 'success' | 'failed';

export interface UpdateHistoryEntry {
  id: number;
  version: string;
  installedDate: string;
  status: UpdateHistoryStatus;
  branch: string;
  message: string;
}

export interface InstallUpdateResult {
  mode: 'docker' | 'binary';
  status: 'restart_required' | 'installed';
  version: string;
  message: string;
  command?: string;
}

interface UpdateServiceOptions {
  fetchFn?: typeof fetch | undefined;
  githubRepo?: string | undefined;
  githubToken?: string | undefined;
  stagingDir?: string | undefined;
  currentVersion?: string | undefined;
  currentExecutablePath?: string | undefined;
  nowFn?: (() => Date) | undefined;
  isDockerFn?: (() => boolean | Promise<boolean>) | undefined;
  platform?: NodeJS.Platform | undefined;
  arch?: string | undefined;
}

interface StagedUpdateArtifact {
  path: string;
  checksum: string;
}

const UPDATE_ID_PREFIX = 'update-';
const DEFAULT_GITHUB_REPO = 'mediarr/mediarr';
const DEFAULT_STAGING_DIR = '/config/updates';

function normalizeVersion(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  return trimmed.startsWith('v') || trimmed.startsWith('V')
    ? trimmed.slice(1)
    : trimmed;
}

function parseSemverTuple(input: string): [number, number, number] | null {
  const cleaned = normalizeVersion(input).split('+')[0]?.split('-')[0] ?? '';
  if (cleaned.length === 0) {
    return null;
  }

  const parts = cleaned.split('.');
  if (parts.length === 0) {
    return null;
  }

  const major = Number.parseInt(parts[0] ?? '', 10);
  const minor = Number.parseInt(parts[1] ?? '0', 10);
  const patch = Number.parseInt(parts[2] ?? '0', 10);

  if (![major, minor, patch].every(Number.isFinite)) {
    return null;
  }

  return [major, minor, patch];
}

function compareSemver(left: string, right: string): number {
  const l = parseSemverTuple(left);
  const r = parseSemverTuple(right);

  if (!l || !r) {
    return normalizeVersion(left).localeCompare(normalizeVersion(right), undefined, { numeric: true });
  }

  if (l[0] !== r[0]) return l[0] - r[0];
  if (l[1] !== r[1]) return l[1] - r[1];
  return l[2] - r[2];
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractChecksum(markdown: string): string | null {
  const explicit = markdown.match(/sha(?:-?256)?[^a-fA-F0-9]*([a-fA-F0-9]{64})/i);
  if (explicit?.[1]) {
    return explicit[1].toLowerCase();
  }

  const fallback = markdown.match(/\b([a-fA-F0-9]{64})\b/);
  return fallback?.[1]?.toLowerCase() ?? null;
}

export class UpdateService {
  private readonly fetchFn: typeof fetch;
  private readonly githubRepo: string;
  private readonly githubToken: string | undefined;
  private readonly stagingDir: string;
  private readonly currentExecutablePath: string | null;
  private readonly nowFn: () => Date;
  private readonly isDockerFn: (() => boolean | Promise<boolean>) | undefined;
  private readonly platform: NodeJS.Platform;
  private readonly arch: string;
  private readonly currentVersion: string;

  private cachedLatestRelease: AvailableUpdateInfo | null = null;
  private lastCheckedAt: string | null = null;
  private lastCheckedBranch: UpdateBranch = 'master';
  private readonly progress = new Map<string, UpdateProgressEntry>();
  private readonly stagedByVersion = new Map<string, StagedUpdateArtifact>();
  private history: UpdateHistoryEntry[] = [];
  private nextHistoryId = 1;
  private nextUpdateId = 1;

  constructor(options: UpdateServiceOptions = {}) {
    const fetchImpl = options.fetchFn ?? globalThis.fetch?.bind(globalThis);
    if (!fetchImpl) {
      throw new ValidationError('Fetch is not available for update service');
    }

    this.fetchFn = fetchImpl;
    this.githubRepo = (options.githubRepo ?? process.env.UPDATE_GITHUB_REPO ?? DEFAULT_GITHUB_REPO).trim();
    this.githubToken = options.githubToken ?? process.env.GITHUB_TOKEN;
    this.stagingDir = options.stagingDir ?? process.env.UPDATE_STAGING_DIR ?? DEFAULT_STAGING_DIR;
    this.currentVersion = options.currentVersion ?? process.env.npm_package_version ?? '0.0.0';
    const configuredInstallTarget = options.currentExecutablePath
      ?? process.env.UPDATE_INSTALL_TARGET;
    this.currentExecutablePath = configuredInstallTarget?.trim() || null;
    this.nowFn = options.nowFn ?? (() => new Date());
    this.isDockerFn = options.isDockerFn;
    this.platform = options.platform ?? process.platform;
    this.arch = options.arch ?? process.arch;
  }

  getCurrentVersionInfo(): {
    version: string;
    branch: string;
    commit: string;
    buildDate: string;
  } {
    return {
      version: this.currentVersion,
      branch: process.env.GIT_BRANCH ?? 'main',
      commit: process.env.GIT_COMMIT ?? 'unknown',
      buildDate: process.env.BUILD_DATE ?? this.nowFn().toISOString(),
    };
  }

  getLatestRelease(): AvailableUpdateInfo | null {
    if (!this.cachedLatestRelease) {
      return null;
    }

    return { ...this.cachedLatestRelease };
  }

  getProgress(updateId: string): UpdateProgressEntry | null {
    const found = this.progress.get(updateId);
    if (!found) {
      return null;
    }

    return { ...found };
  }

  listHistory(): UpdateHistoryEntry[] {
    return this.history.map(entry => ({ ...entry }));
  }

  listProgress(): UpdateProgressEntry[] {
    return Array.from(this.progress.values()).map(entry => ({ ...entry }));
  }

  async checkForUpdate(input: { branch?: UpdateBranch } = {}): Promise<CheckForUpdateResult> {
    const branch = input.branch ?? 'master';
    this.lastCheckedBranch = branch;

    const release = await this.fetchLatestRelease(branch);
    const isDocker = await this.isRunningInDocker();
    const checkedAt = this.nowFn().toISOString();
    this.lastCheckedAt = checkedAt;

    const isNewer = compareSemver(release.version, this.currentVersion) > 0;
    this.cachedLatestRelease = isNewer ? release : null;

    return {
      checkedAt,
      currentVersion: this.currentVersion,
      updateAvailable: isNewer,
      isDocker,
      release: isNewer ? { ...release } : null,
    };
  }

  async downloadUpdate(input: { version?: string | undefined } = {}): Promise<UpdateProgressEntry> {
    const release = this.resolveReleaseForDownload(input.version);
    if (!release.expectedChecksum) {
      throw new ProviderUnavailableError('Release is missing a required SHA-256 checksum');
    }

    const updateId = `${UPDATE_ID_PREFIX}${this.nextUpdateId++}`;
    const startedAt = this.nowFn().toISOString();

    this.progress.set(updateId, {
      updateId,
      version: release.version,
      status: 'queued',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: null,
      message: 'Queued for download',
      startedAt,
    });

    try {
      await fs.mkdir(this.stagingDir, { recursive: true });

      this.patchProgress(updateId, {
        status: 'downloading',
        message: `Downloading ${release.assetName}`,
      });

      const response = await this.fetchAsset(release.downloadUrl);
      const totalBytes = readNumber(response.headers.get('content-length'));
      const stagedPath = path.join(this.stagingDir, `mediarr-${release.version}`);

      await this.writeDownloadToDisk(updateId, response, stagedPath, totalBytes, release.expectedChecksum);

      this.stagedByVersion.set(release.version, {
        path: stagedPath,
        checksum: release.expectedChecksum,
      });
      this.patchProgress(updateId, {
        status: 'completed',
        progress: 100,
        message: 'Download completed',
        completedAt: this.nowFn().toISOString(),
        stagedPath,
      });

      return this.getProgressOrThrow(updateId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      this.patchProgress(updateId, {
        status: 'failed',
        message,
        error: message,
        completedAt: this.nowFn().toISOString(),
      });
      throw error;
    }
  }

  async installUpdate(input: { version?: string | undefined; updateId?: string | undefined }): Promise<InstallUpdateResult> {
    const version = input.version ?? this.resolveVersionFromUpdateId(input.updateId);

    if (!version) {
      throw new ValidationError('version or updateId is required for install');
    }

    const dockerMode = await this.isRunningInDocker();
    if (dockerMode) {
      this.appendHistory({
        version,
        status: 'success',
        message: 'Docker image update available. Manual restart required.',
      });

      return {
        mode: 'docker',
        status: 'restart_required',
        version,
        message: 'Running in Docker. Pull the latest image and restart the container.',
        command: `docker pull ghcr.io/${this.githubRepo}:${version} && docker restart <container-name>`,
      };
    }

    const stagedArtifact = this.resolveStagedArtifact(input.updateId, version);
    const installTarget = await this.resolveInstallTarget();

    try {
      if (input.updateId) {
        this.patchProgress(input.updateId, {
          status: 'installing',
          message: 'Installing update',
        });
      }

      await this.verifyStagedArtifact(stagedArtifact);
      await this.replaceExecutableAtomically(
        stagedArtifact.path,
        installTarget.path,
        installTarget.mode,
        version,
      );

      if (input.updateId) {
        this.patchProgress(input.updateId, {
          status: 'completed',
          progress: 100,
          message: 'Update installed successfully',
          completedAt: this.nowFn().toISOString(),
        });
      }

      this.appendHistory({
        version,
        status: 'success',
        message: 'Binary replaced successfully.',
      });

      return {
        mode: 'binary',
        status: 'installed',
        version,
        message: 'Binary replaced. Restart Mediarr to run the new version.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Install failed';

      if (input.updateId) {
        this.patchProgress(input.updateId, {
          status: 'failed',
          message,
          error: message,
          completedAt: this.nowFn().toISOString(),
        });
      }

      this.appendHistory({
        version,
        status: 'failed',
        message,
      });

      throw new ProviderUnavailableError(`Failed to install update: ${message}`);
    }
  }

  resetForTests(): void {
    this.cachedLatestRelease = null;
    this.lastCheckedAt = null;
    this.progress.clear();
    this.stagedByVersion.clear();
    this.history = [];
    this.nextHistoryId = 1;
    this.nextUpdateId = 1;
  }

  private async isRunningInDocker(): Promise<boolean> {
    if (this.isDockerFn) {
      return Boolean(await this.isDockerFn());
    }

    if (process.env.DOCKER_ENV) {
      return true;
    }

    try {
      await fs.access('/.dockerenv', fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async fetchLatestRelease(branch: UpdateBranch): Promise<AvailableUpdateInfo> {
    if (branch === 'develop' || branch === 'phantom') {
      const releases = await this.fetchGitHubJson(`https://api.github.com/repos/${this.githubRepo}/releases`) as unknown;
      if (!Array.isArray(releases)) {
        throw new ProviderUnavailableError('GitHub releases API returned an invalid payload');
      }

      const mapped = releases
        .map(entry => this.mapRelease(entry as GitHubRelease))
        .filter((entry): entry is AvailableUpdateInfo => entry !== null);

      if (mapped.length === 0) {
        throw new NotFoundError('No releases available from GitHub');
      }

      if (branch === 'develop') {
        const prerelease = releases.find((release) => {
          const candidate = release as GitHubRelease;
          return candidate.prerelease === true;
        });

        const mappedPrerelease = prerelease ? this.mapRelease(prerelease as GitHubRelease) : null;
        if (mappedPrerelease) {
          return mappedPrerelease;
        }
      }

      return mapped[0]!;
    }

    const latest = await this.fetchGitHubJson(`https://api.github.com/repos/${this.githubRepo}/releases/latest`) as GitHubRelease;
    const mapped = this.mapRelease(latest);

    if (!mapped) {
      throw new ProviderUnavailableError(
        'GitHub latest release is missing an exact supported asset or required SHA-256 checksum',
      );
    }

    return mapped;
  }

  private mapRelease(release: GitHubRelease): AvailableUpdateInfo | null {
    const tagName = readString(release.tag_name);
    if (!tagName) {
      return null;
    }

    const version = normalizeVersion(tagName);
    const changelog = readString(release.body) ?? '';
    const publishedAt = readString(release.published_at) ?? this.nowFn().toISOString();

    const assets = Array.isArray(release.assets)
      ? release.assets as GitHubReleaseAsset[]
      : [];

    const selectable = assets
      .map(asset => {
        const name = readString(asset.name);
        const downloadUrl = readString(asset.browser_download_url);
        const contentType = readString(asset.content_type) ?? 'application/octet-stream';
        const size = readNumber(asset.size);

        if (!name || !downloadUrl) {
          return null;
        }

        return {
          name,
          downloadUrl,
          contentType,
          size,
        };
      })
      .filter((asset): asset is { name: string; downloadUrl: string; contentType: string; size: number | null } => asset !== null);

    if (selectable.length === 0) {
      return null;
    }

    const platformToken = this.platform.toLowerCase();
    const archToken = this.arch.toLowerCase();
    const expectedAssetName = `mediarr-${platformToken}-${archToken}${this.platform === 'win32' ? '.exe' : ''}`;
    const selected = selectable.find(
      asset => asset.name.toLowerCase() === expectedAssetName,
    );
    const expectedChecksum = extractChecksum(changelog);

    if (!selected || !expectedChecksum) {
      return null;
    }

    return {
      version,
      tagName,
      changelog,
      publishedAt,
      downloadUrl: selected.downloadUrl,
      assetName: selected.name,
      assetContentType: selected.contentType,
      expectedChecksum,
    };
  }

  private async fetchGitHubJson(url: string): Promise<unknown> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'mediarr-update-service',
      };

      if (this.githubToken) {
        headers.Authorization = `Bearer ${this.githubToken}`;
      }

      const response = await this.fetchFn(url, {
        method: 'GET',
        headers,
      });

      if (response.status === 403) {
        throw new ProviderUnavailableError('GitHub API rate limit reached');
      }

      if (!response.ok) {
        throw new ProviderUnavailableError(`GitHub API request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ProviderUnavailableError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'GitHub API request failed';
      throw new ProviderUnavailableError(`Failed to fetch GitHub release data: ${message}`);
    }
  }

  private async fetchAsset(url: string): Promise<Response> {
    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'mediarr-update-service',
      },
    });

    if (!response.ok) {
      throw new ProviderUnavailableError(`Failed to download release asset (status ${response.status})`);
    }

    return response;
  }

  private resolveReleaseForDownload(version?: string): AvailableUpdateInfo {
    if (!this.cachedLatestRelease) {
      throw new NotFoundError('No cached update available. Run check-for-update first.');
    }

    if (!version) {
      return this.cachedLatestRelease;
    }

    if (normalizeVersion(version) !== normalizeVersion(this.cachedLatestRelease.version)) {
      throw new NotFoundError(`Cached update does not match requested version '${version}'`);
    }

    return this.cachedLatestRelease;
  }

  private async writeDownloadToDisk(
    updateId: string,
    response: Response,
    stagedPath: string,
    totalBytes: number | null,
    expectedChecksum: string | null,
  ): Promise<void> {
    const hash = createHash('sha256');
    let bytesDownloaded = 0;

    if (!response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      bytesDownloaded = buffer.byteLength;
      hash.update(buffer);
      await fs.writeFile(stagedPath, buffer);
    } else {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }

        chunks.push(chunk.value);
        bytesDownloaded += chunk.value.byteLength;
        hash.update(chunk.value);

        const progress = totalBytes && totalBytes > 0
          ? Math.min(99, Math.round((bytesDownloaded / totalBytes) * 100))
          : 0;

        this.patchProgress(updateId, {
          totalBytes,
          bytesDownloaded,
          progress,
          message: 'Downloading update binary',
        });
      }

      const merged = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      await fs.writeFile(stagedPath, merged);
    }

    this.patchProgress(updateId, {
      status: 'verifying',
      bytesDownloaded,
      totalBytes,
      progress: 99,
      message: 'Verifying checksum',
    });

    const actualChecksum = hash.digest('hex').toLowerCase();
    if (expectedChecksum && actualChecksum !== expectedChecksum.toLowerCase()) {
      await fs.rm(stagedPath, { force: true });
      throw new ProviderUnavailableError('Checksum verification failed');
    }
  }

  private patchProgress(updateId: string, patch: Partial<UpdateProgressEntry>): void {
    const current = this.progress.get(updateId);
    if (!current) {
      return;
    }

    this.progress.set(updateId, {
      ...current,
      ...patch,
    });
  }

  private getProgressOrThrow(updateId: string): UpdateProgressEntry {
    const found = this.getProgress(updateId);
    if (!found) {
      throw new NotFoundError(`No update progress found for '${updateId}'`);
    }

    return found;
  }

  private resolveVersionFromUpdateId(updateId?: string): string | null {
    if (!updateId) {
      return null;
    }

    const progress = this.progress.get(updateId);
    return progress?.version ?? null;
  }

  private resolveStagedArtifact(
    updateId: string | undefined,
    version: string,
  ): StagedUpdateArtifact {
    const normalizedVersion = normalizeVersion(version);
    const staged = this.stagedByVersion.get(normalizedVersion);
    const progress = updateId ? this.progress.get(updateId) : null;

    if (
      staged
      && (!progress || normalizeVersion(progress.version) === normalizedVersion)
    ) {
      return staged;
    }

    const fallback = path.join(this.stagingDir, `mediarr-${normalizedVersion}`);
    throw new NotFoundError(`No verified staged update artifact found at ${fallback}`);
  }

  private async resolveInstallTarget(): Promise<{ path: string; mode: number }> {
    if (!this.currentExecutablePath) {
      throw new ValidationError(
        'Non-container updates require an explicit application-owned install target via UPDATE_INSTALL_TARGET',
      );
    }

    if (this.platform === 'win32') {
      throw new ValidationError(
        'In-place non-container updates are not supported on Windows; use a container update',
      );
    }

    const targetPath = path.resolve(this.currentExecutablePath);
    const runtimePath = await fs.realpath(process.execPath).catch(
      () => path.resolve(process.execPath),
    );

    let targetStats;
    try {
      targetStats = await fs.lstat(targetPath);
    } catch {
      throw new ValidationError(
        `Configured update install target does not exist: ${targetPath}`,
      );
    }

    if (targetStats.isSymbolicLink() || !targetStats.isFile()) {
      throw new ValidationError(
        'Configured update install target must be an existing regular file and not a symbolic link',
      );
    }

    const realTargetPath = await fs.realpath(targetPath);
    if (realTargetPath === runtimePath || targetPath === path.resolve(process.execPath)) {
      throw new ValidationError('The Bun/Node runtime executable cannot be an update install target');
    }

    return {
      path: realTargetPath,
      mode: targetStats.mode & 0o777,
    };
  }

  private async verifyStagedArtifact(artifact: StagedUpdateArtifact): Promise<void> {
    const stagedStats = await fs.lstat(artifact.path).catch(() => null);
    if (!stagedStats || stagedStats.isSymbolicLink() || !stagedStats.isFile()) {
      throw new ProviderUnavailableError('Verified staged update artifact is missing or invalid');
    }

    const actualChecksum = createHash('sha256')
      .update(await fs.readFile(artifact.path))
      .digest('hex')
      .toLowerCase();

    if (actualChecksum !== artifact.checksum.toLowerCase()) {
      throw new ProviderUnavailableError('Staged update checksum verification failed');
    }
  }

  private async replaceExecutableAtomically(
    stagedPath: string,
    targetPath: string,
    targetMode: number,
    version: string,
  ): Promise<void> {
    const parentDirectory = path.dirname(targetPath);
    const safeVersion = normalizeVersion(version).replace(/[^a-zA-Z0-9._-]/g, '_');
    const nextPath = path.join(
      parentDirectory,
      `.${path.basename(targetPath)}.update-${safeVersion}.next`,
    );
    const backupPath = `${targetPath}.previous`;
    const nextBackupPath = `${backupPath}.next`;
    let targetReplacementStarted = false;

    await fs.rm(nextPath, { force: true });
    await fs.rm(nextBackupPath, { force: true });

    try {
      await fs.copyFile(stagedPath, nextPath, fsConstants.COPYFILE_EXCL);
      await fs.chmod(nextPath, targetMode | 0o100);
      await this.syncFile(nextPath);

      await fs.copyFile(targetPath, nextBackupPath, fsConstants.COPYFILE_EXCL);
      await fs.chmod(nextBackupPath, targetMode);
      await this.syncFile(nextBackupPath);
      await fs.rm(backupPath, { force: true });
      await fs.rename(nextBackupPath, backupPath);
      await this.syncDirectory(parentDirectory);

      targetReplacementStarted = true;
      await fs.rename(nextPath, targetPath);
      await this.syncDirectory(parentDirectory);
    } catch (error) {
      let rollbackError: unknown = null;

      if (targetReplacementStarted) {
        try {
          await fs.rename(backupPath, targetPath);
          await this.syncDirectory(parentDirectory);
        } catch (caughtRollbackError) {
          rollbackError = caughtRollbackError;
        }
      }

      await fs.rm(nextPath, { force: true }).catch(() => {});
      await fs.rm(nextBackupPath, { force: true }).catch(() => {});

      if (rollbackError) {
        const installMessage = error instanceof Error ? error.message : 'replacement failed';
        const rollbackMessage = rollbackError instanceof Error
          ? rollbackError.message
          : 'rollback failed';
        throw new Error(
          `${installMessage}; rollback failed: ${rollbackMessage}. Recovery copy: ${backupPath}`,
        );
      }

      throw error;
    }
  }

  private async syncFile(filePath: string): Promise<void> {
    const handle = await fs.open(filePath, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  private async syncDirectory(directoryPath: string): Promise<void> {
    const handle = await fs.open(directoryPath, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  private appendHistory(entry: {
    version: string;
    status: UpdateHistoryStatus;
    message: string;
  }): void {
    const installedDate = this.nowFn().toISOString();

    const record: UpdateHistoryEntry = {
      id: this.nextHistoryId++,
      version: normalizeVersion(entry.version),
      installedDate,
      status: entry.status,
      branch: this.lastCheckedBranch,
      message: entry.message,
    };

    this.history = [record, ...this.history].slice(0, 200);
  }
}
