import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface FilterBlock {
  name: string;
  args?: any[] | undefined;
}

export interface SelectorBlock {
  selector?: string | undefined;
  attribute?: string | undefined;
  text?: string | undefined;
  optional?: boolean | undefined;
  default?: string | undefined;
  remove?: string | undefined;
  filters?: FilterBlock[] | undefined;
  case?: Record<string, string> | undefined;
}

export interface CategoryMapping {
  id: string;
  cat: string;
  desc?: string | undefined;
  default?: boolean | undefined;
}

export interface CapabilitiesBlock {
  categories?: Record<string, string> | undefined;
  categorymappings?: CategoryMapping[] | undefined;
  modes?: Record<string, string[]>;
  allowrawsearch?: boolean;
}

export interface SettingsField {
  name: string;
  type: string;
  label: string;
  default?: any;
  optional?: boolean;
}

export interface LoginBlock {
  path: string;
  submitpath?: string;
  method: string;
  inputs?: Record<string, string>;
  selectorinputs?: Record<string, SelectorBlock>;
  cookies?: string[];
  test?: {
    path: string;
    selector?: string;
  };
  error?: Array<{
    path?: string;
    selector?: string;
    message?: SelectorBlock;
  }>;
}

export interface SearchPathBlock {
  path: string;
  categories?: string[];
  inputs?: Record<string, string>;
  inheritinputs?: boolean;
  followredirect?: boolean;
  response?: {
    type: string;
    noResultsMessage?: string;
  };
}

export interface RowsBlock {
  selector: string;
  attribute?: string;
  after?: number;
  multiple?: boolean;
  missingAttributeEqualsNoResults?: boolean;
  filters?: FilterBlock[];
  count?: SelectorBlock;
  dateheaders?: SelectorBlock;
}

export interface SearchBlock {
  paths: SearchPathBlock[];
  path?: string;
  inputs?: Record<string, string>;
  headers?: Record<string, string[]>;
  keywordsfilters?: FilterBlock[];
  rows: RowsBlock;
  fields: Record<string, SelectorBlock>;
  error?: Array<{
    path?: string;
    selector?: string;
  }>;
}

export interface DownloadBlock {
  selectors?: Array<{ selector: string; attribute?: string }>;
  method?: string;
  headers?: Record<string, string[]>;
}

export interface CardigannDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'semi-private';
  language?: string;
  encoding?: string;
  requestDelay?: number;
  links: string[];
  legacylinks?: string[];
  settings?: SettingsField[];
  caps?: CapabilitiesBlock;
  login?: LoginBlock;
  search: SearchBlock;
  download?: DownloadBlock;
}

export class DefinitionLoader {
  /**
   * Load and parse a single YAML definition file.
   */
  async loadFromFile(filePath: string): Promise<CardigannDefinition> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const raw = yaml.load(content) as any;
    return this.normalize(raw);
  }

  /**
   * Load all YAML definitions from a directory.
   */
  async loadFromDirectory(dirPath: string): Promise<CardigannDefinition[]> {
    const entries = await fs.promises.readdir(dirPath);
    const ymlFiles = entries.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    const definitions: CardigannDefinition[] = [];
    for (const file of ymlFiles) {
      const def = await this.loadFromFile(path.join(dirPath, file));
      definitions.push(def);
    }
    return definitions;
  }

  /**
   * Validate that a definition has all required fields.
   */
  validate(def: any): void {
    if (!def.id) {
      throw new Error('Definition missing required field: id');
    }
    if (!def.name) {
      throw new Error('Definition missing required field: name');
    }
    if (!def.type) {
      throw new Error('Definition missing required field: type');
    }
    if (!def.links || !Array.isArray(def.links) || def.links.length === 0) {
      throw new Error('Definition missing required field: links (must be a non-empty array)');
    }
  }

  /**
   * Normalize raw YAML into a typed CardigannDefinition.
   * Applies defaults and converts legacy single-path search to paths array.
   */
  private normalize(raw: any): CardigannDefinition {
    const def = { ...raw } as CardigannDefinition;

    // Default encoding
    if (!def.encoding) {
      def.encoding = 'UTF-8';
    }

    // Map site to id if id is missing (standard Cardigann format)
    if (!def.id && (raw as any).site) {
      def.id = (raw as any).site;
    }

    // Normalize search: convert single path to paths array
    if (def.search) {
      if (def.search.path && !def.search.paths) {
        def.search.paths = [{ path: def.search.path }];
      }
      delete (def.search as any).path;
    }

    return def;
  }
}
