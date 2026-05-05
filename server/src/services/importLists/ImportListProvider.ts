export interface ImportListItem {
  tmdbId?: number | undefined;
  imdbId?: string | undefined;
  tvdbId?: number | undefined;
  title: string;
  year?: number | undefined;
  mediaType: 'movie' | 'series';
}

export interface ImportListProvider {
  readonly type: string;
  readonly name: string;
  
  fetch(config: Record<string, unknown>): Promise<ImportListItem[]>;
  validateConfig(config: Record<string, unknown>): boolean;
}

export interface ImportListProviderFactory {
  getProvider(type: string): ImportListProvider | undefined;
  registerProvider(provider: ImportListProvider): void;
  getAllProviderTypes(): string[];
}
