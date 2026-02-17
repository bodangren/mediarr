import type { ImportListProvider, ImportListProviderFactory } from './ImportListProvider';

export class ImportListProviderRegistry implements ImportListProviderFactory {
  private providers: Map<string, ImportListProvider> = new Map();

  registerProvider(provider: ImportListProvider): void {
    this.providers.set(provider.type, provider);
  }

  getProvider(type: string): ImportListProvider | undefined {
    return this.providers.get(type);
  }

  getAllProviderTypes(): string[] {
    return Array.from(this.providers.keys());
  }
}
