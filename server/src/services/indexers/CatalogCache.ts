import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  type: 'torznab' | 'newznab' | string;
  baseUrl: string;
  categories: string[];
  requiresApiKey: boolean;
  signupUrl?: string;
  implementation: string;
  configContract: string;
  supportedMediaTypes: string[];
  supportsSearch: boolean;
  supportsRss: boolean;
}

export class CatalogCache {
  private catalog: CatalogEntry[] | null = null;
  private catalogPath: string;
  private watcher: fs.FSWatcher | null = null;

  constructor(catalogPath?: string) {
    this.catalogPath = catalogPath ?? this.resolveCatalogPath();
  }

  private resolveCatalogPath(): string {
    return path.resolve(__dirname, '../../data/popular-indexers.json');
  }

  async load(): Promise<void> {
    try {
      const content = await fs.promises.readFile(this.catalogPath, 'utf-8');
      this.catalog = JSON.parse(content) as CatalogEntry[];
    } catch {
      this.catalog = [];
    }
  }

  get(): CatalogEntry[] {
    if (this.catalog === null) {
      throw new Error('CatalogCache not loaded. Call load() before get().');
    }
    return this.catalog;
  }

  invalidate(): void {
    this.catalog = null;
  }

  getCatalogPath(): string {
    return this.catalogPath;
  }

  watch(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = fs.watch(this.catalogPath, (eventType) => {
      if (eventType === 'change' || eventType === 'rename') {
        this.load().catch(() => {
          this.catalog = [];
        });
      }
    });
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
