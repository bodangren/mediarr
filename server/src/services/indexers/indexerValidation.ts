import { ValidationError } from '../../errors/domainErrors';
import type { CatalogEntry } from './CatalogCache';

export interface CatalogValidationResult {
  valid: boolean;
  requiresApiKey: boolean;
  message?: string;
}

export function validateCatalogEntry(
  entry: CatalogEntry,
  apiKey?: string,
): CatalogValidationResult {
  if (entry.requiresApiKey) {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        valid: false,
        requiresApiKey: true,
        message: `Indexer "${entry.name}" requires an API key. Please provide one.`,
      };
    }
  }

  return {
    valid: true,
    requiresApiKey: entry.requiresApiKey,
  };
}
