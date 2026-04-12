import { createRequire } from 'node:module';
import { eq } from 'drizzle-orm';
import * as schema from './schema.js';

type AnyRecord = Record<string, any>;

type SortDirection = 'asc' | 'desc';

type QueryArgs = {
  where?: AnyRecord;
  select?: AnyRecord;
  include?: AnyRecord;
  orderBy?: AnyRecord | AnyRecord[];
  skip?: number;
  take?: number;
};

type RelationConfig = {
  kind: 'one' | 'many';
  model: ModelName;
  sourceField?: string;
  targetField: string;
};

type ModelConfig = {
  table: any;
  primaryKey: string;
  relations: Record<string, RelationConfig>;
};

type ModelName =
  | 'media'
  | 'series'
  | 'season'
  | 'episode'
  | 'movie'
  | 'mediaFileVariant'
  | 'variantMissingSubtitle'
  | 'variantAudioTrack'
  | 'variantSubtitleTrack'
  | 'wantedSubtitle'
  | 'subtitleHistory'
  | 'qualityProfile'
  | 'collection'
  | 'importList'
  | 'importListExclusion'
  | 'customFilter'
  | 'customFormat'
  | 'customFormatScore'
  | 'qualityDefinition'
  | 'indexer'
  | 'proxy'
  | 'indexerCategory'
  | 'indexerRelease'
  | 'category'
  | 'torrent'
  | 'torrentPeer'
  | 'appSettings'
  | 'playbackProgress'
  | 'indexerHealthSnapshot'
  | 'activityEvent'
  | 'notification'
  | 'downloadClient'
  | 'blocklist';

const MODEL_CONFIG: Record<ModelName, ModelConfig> = {
  media: {
    table: schema.media,
    primaryKey: 'id',
    relations: {
      qualityProfile: { kind: 'one', model: 'qualityProfile', sourceField: 'qualityProfileId', targetField: 'id' },
      series: { kind: 'one', model: 'series', targetField: 'mediaId' },
      movie: { kind: 'one', model: 'movie', targetField: 'mediaId' },
    },
  },
  series: {
    table: schema.series,
    primaryKey: 'id',
    relations: {
      qualityProfile: { kind: 'one', model: 'qualityProfile', sourceField: 'qualityProfileId', targetField: 'id' },
      media: { kind: 'one', model: 'media', sourceField: 'mediaId', targetField: 'id' },
      seasons: { kind: 'many', model: 'season', targetField: 'seriesId' },
      episodes: { kind: 'many', model: 'episode', targetField: 'seriesId' },
    },
  },
  season: {
    table: schema.seasons,
    primaryKey: 'id',
    relations: {
      series: { kind: 'one', model: 'series', sourceField: 'seriesId', targetField: 'id' },
      episodes: { kind: 'many', model: 'episode', targetField: 'seasonId' },
    },
  },
  episode: {
    table: schema.episodes,
    primaryKey: 'id',
    relations: {
      series: { kind: 'one', model: 'series', sourceField: 'seriesId', targetField: 'id' },
      season: { kind: 'one', model: 'season', sourceField: 'seasonId', targetField: 'id' },
      fileVariants: { kind: 'many', model: 'mediaFileVariant', targetField: 'episodeId' },
    },
  },
  movie: {
    table: schema.movies,
    primaryKey: 'id',
    relations: {
      qualityProfile: { kind: 'one', model: 'qualityProfile', sourceField: 'qualityProfileId', targetField: 'id' },
      collection: { kind: 'one', model: 'collection', sourceField: 'collectionId', targetField: 'id' },
      media: { kind: 'one', model: 'media', sourceField: 'mediaId', targetField: 'id' },
      fileVariants: { kind: 'many', model: 'mediaFileVariant', targetField: 'movieId' },
    },
  },
  mediaFileVariant: {
    table: schema.mediaFileVariants,
    primaryKey: 'id',
    relations: {
      movie: { kind: 'one', model: 'movie', sourceField: 'movieId', targetField: 'id' },
      episode: { kind: 'one', model: 'episode', sourceField: 'episodeId', targetField: 'id' },
      audioTracks: { kind: 'many', model: 'variantAudioTrack', targetField: 'variantId' },
      subtitleTracks: { kind: 'many', model: 'variantSubtitleTrack', targetField: 'variantId' },
      missingSubtitles: { kind: 'many', model: 'variantMissingSubtitle', targetField: 'variantId' },
      wantedSubtitles: { kind: 'many', model: 'wantedSubtitle', targetField: 'variantId' },
      subtitleHistories: { kind: 'many', model: 'subtitleHistory', targetField: 'variantId' },
    },
  },
  variantMissingSubtitle: {
    table: schema.variantMissingSubtitles,
    primaryKey: 'id',
    relations: {
      variant: { kind: 'one', model: 'mediaFileVariant', sourceField: 'variantId', targetField: 'id' },
    },
  },
  variantAudioTrack: {
    table: schema.variantAudioTracks,
    primaryKey: 'id',
    relations: {
      variant: { kind: 'one', model: 'mediaFileVariant', sourceField: 'variantId', targetField: 'id' },
    },
  },
  variantSubtitleTrack: {
    table: schema.variantSubtitleTracks,
    primaryKey: 'id',
    relations: {
      variant: { kind: 'one', model: 'mediaFileVariant', sourceField: 'variantId', targetField: 'id' },
    },
  },
  wantedSubtitle: {
    table: schema.wantedSubtitles,
    primaryKey: 'id',
    relations: {
      variant: { kind: 'one', model: 'mediaFileVariant', sourceField: 'variantId', targetField: 'id' },
      history: { kind: 'many', model: 'subtitleHistory', targetField: 'wantedSubtitleId' },
    },
  },
  subtitleHistory: {
    table: schema.subtitleHistories,
    primaryKey: 'id',
    relations: {
      variant: { kind: 'one', model: 'mediaFileVariant', sourceField: 'variantId', targetField: 'id' },
      wantedSubtitle: { kind: 'one', model: 'wantedSubtitle', sourceField: 'wantedSubtitleId', targetField: 'id' },
    },
  },
  qualityProfile: {
    table: schema.qualityProfiles,
    primaryKey: 'id',
    relations: {
      medias: { kind: 'many', model: 'media', targetField: 'qualityProfileId' },
      series: { kind: 'many', model: 'series', targetField: 'qualityProfileId' },
      movies: { kind: 'many', model: 'movie', targetField: 'qualityProfileId' },
      collections: { kind: 'many', model: 'collection', targetField: 'qualityProfileId' },
      customFormatScores: { kind: 'many', model: 'customFormatScore', targetField: 'qualityProfileId' },
      importLists: { kind: 'many', model: 'importList', targetField: 'qualityProfileId' },
    },
  },
  collection: {
    table: schema.collections,
    primaryKey: 'id',
    relations: {
      qualityProfile: { kind: 'one', model: 'qualityProfile', sourceField: 'qualityProfileId', targetField: 'id' },
      movies: { kind: 'many', model: 'movie', targetField: 'collectionId' },
    },
  },
  importList: {
    table: schema.importLists,
    primaryKey: 'id',
    relations: {
      qualityProfile: { kind: 'one', model: 'qualityProfile', sourceField: 'qualityProfileId', targetField: 'id' },
      exclusions: { kind: 'many', model: 'importListExclusion', targetField: 'importListId' },
    },
  },
  importListExclusion: {
    table: schema.importListExclusions,
    primaryKey: 'id',
    relations: {
      importList: { kind: 'one', model: 'importList', sourceField: 'importListId', targetField: 'id' },
    },
  },
  customFilter: {
    table: schema.customFilters,
    primaryKey: 'id',
    relations: {},
  },
  customFormat: {
    table: schema.customFormats,
    primaryKey: 'id',
    relations: {
      scores: { kind: 'many', model: 'customFormatScore', targetField: 'customFormatId' },
    },
  },
  customFormatScore: {
    table: schema.customFormatScores,
    primaryKey: 'id',
    relations: {
      customFormat: { kind: 'one', model: 'customFormat', sourceField: 'customFormatId', targetField: 'id' },
      qualityProfile: { kind: 'one', model: 'qualityProfile', sourceField: 'qualityProfileId', targetField: 'id' },
    },
  },
  qualityDefinition: {
    table: schema.qualityDefinitions,
    primaryKey: 'id',
    relations: {},
  },
  indexer: {
    table: schema.indexers,
    primaryKey: 'id',
    relations: {
      releases: { kind: 'many', model: 'indexerRelease', targetField: 'indexerId' },
      healthSnapshot: { kind: 'one', model: 'indexerHealthSnapshot', targetField: 'indexerId' },
    },
  },
  proxy: {
    table: schema.proxies,
    primaryKey: 'id',
    relations: {},
  },
  indexerCategory: {
    table: schema.indexerCategories,
    primaryKey: 'id',
    relations: {},
  },
  indexerRelease: {
    table: schema.indexerReleases,
    primaryKey: 'id',
    relations: {
      indexer: { kind: 'one', model: 'indexer', sourceField: 'indexerId', targetField: 'id' },
    },
  },
  category: {
    table: schema.categories,
    primaryKey: 'id',
    relations: {},
  },
  torrent: {
    table: schema.torrents,
    primaryKey: 'id',
    relations: {
      peers: { kind: 'many', model: 'torrentPeer', targetField: 'torrentId' },
    },
  },
  torrentPeer: {
    table: schema.torrentPeers,
    primaryKey: 'id',
    relations: {
      torrent: { kind: 'one', model: 'torrent', sourceField: 'torrentId', targetField: 'id' },
    },
  },
  appSettings: {
    table: schema.appSettings,
    primaryKey: 'id',
    relations: {},
  },
  playbackProgress: {
    table: schema.playbackProgress,
    primaryKey: 'id',
    relations: {},
  },
  indexerHealthSnapshot: {
    table: schema.indexerHealthSnapshots,
    primaryKey: 'id',
    relations: {
      indexer: { kind: 'one', model: 'indexer', sourceField: 'indexerId', targetField: 'id' },
    },
  },
  activityEvent: {
    table: schema.activityEvents,
    primaryKey: 'id',
    relations: {},
  },
  notification: {
    table: schema.notifications,
    primaryKey: 'id',
    relations: {},
  },
  downloadClient: {
    table: schema.downloadClients,
    primaryKey: 'id',
    relations: {},
  },
  blocklist: {
    table: schema.blocklists,
    primaryKey: 'id',
    relations: {},
  },
};

const FILTER_OPERATOR_KEYS = new Set([
  'equals',
  'in',
  'notIn',
  'not',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'startsWith',
  'endsWith',
  'mode',
  'some',
  'every',
  'none',
  'is',
  'isNot',
]);

function normalizeDatabasePath(url: string | undefined): string {
  const fallback = './mediarr.db';
  if (!url) {
    return fallback;
  }

  if (!url.startsWith('file:')) {
    return url;
  }

  const stripped = url.slice('file:'.length);
  return stripped.length > 0 ? stripped : fallback;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function normalizeWhereObject(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(normalizeWhereObject);
  }
  if (!isPlainObject(input)) {
    return input;
  }

  const output: AnyRecord = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      output[key] = normalizeWhereObject(value);
      continue;
    }

    if (
      key.includes('_')
      && isPlainObject(value)
      && !Object.keys(value).some((k) => FILTER_OPERATOR_KEYS.has(k))
    ) {
      const nested = normalizeWhereObject(value);
      if (isPlainObject(nested)) {
        Object.assign(output, nested);
        continue;
      }
    }

    output[key] = normalizeWhereObject(value);
  }
  return output;
}

function coerceComparable(value: unknown): unknown {
  if (value instanceof Date) {
    return value.getTime();
  }
  return value;
}

function scalarEqual(left: unknown, right: unknown): boolean {
  const a = coerceComparable(left);
  const b = coerceComparable(right);
  return a === b;
}

function compareValues(left: unknown, right: unknown): number {
  const a = coerceComparable(left);
  const b = coerceComparable(right);
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a < b ? -1 : 1;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a < b ? -1 : 1;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  return String(a).localeCompare(String(b));
}

type QueryContext = {
  rowsCache: Map<ModelName, Promise<any[]>>;
};

export class PrismaClient {
  private readonly sqlite: any;

  private readonly db: any;

  readonly media: AnyRecord;
  readonly series: AnyRecord;
  readonly season: AnyRecord;
  readonly episode: AnyRecord;
  readonly movie: AnyRecord;
  readonly mediaFileVariant: AnyRecord;
  readonly variantMissingSubtitle: AnyRecord;
  readonly variantAudioTrack: AnyRecord;
  readonly variantSubtitleTrack: AnyRecord;
  readonly wantedSubtitle: AnyRecord;
  readonly subtitleHistory: AnyRecord;
  readonly qualityProfile: AnyRecord;
  readonly collection: AnyRecord;
  readonly importList: AnyRecord;
  readonly importListExclusion: AnyRecord;
  readonly customFilter: AnyRecord;
  readonly customFormat: AnyRecord;
  readonly customFormatScore: AnyRecord;
  readonly qualityDefinition: AnyRecord;
  readonly indexer: AnyRecord;
  readonly proxy: AnyRecord;
  readonly indexerCategory: AnyRecord;
  readonly indexerRelease: AnyRecord;
  readonly category: AnyRecord;
  readonly torrent: AnyRecord;
  readonly torrentPeer: AnyRecord;
  readonly appSettings: AnyRecord;
  readonly playbackProgress: AnyRecord;
  readonly indexerHealthSnapshot: AnyRecord;
  readonly activityEvent: AnyRecord;
  readonly notification: AnyRecord;
  readonly downloadClient: AnyRecord;
  readonly blocklist: AnyRecord;

  constructor(options?: { datasources?: { db?: { url?: string } } }) {
    const require = createRequire(import.meta.url);
    const dbPath = normalizeDatabasePath(options?.datasources?.db?.url ?? process.env.DATABASE_URL);
    let bunSqlite: any = null;
    try {
      bunSqlite = require('bun:sqlite');
    } catch {
      bunSqlite = null;
    }

    if (bunSqlite) {
      const { drizzle: drizzleBun } = require('drizzle-orm/bun-sqlite');
      const BunDatabase = bunSqlite.default ?? bunSqlite.Database ?? bunSqlite;
      this.sqlite = new BunDatabase(dbPath);
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA foreign_keys = ON;');
      this.db = drizzleBun(this.sqlite, { schema });
    } else {
      const { drizzle: drizzleBetterSqlite } = require('drizzle-orm/better-sqlite3');
      const BetterSqlite3 = require('better-sqlite3');
      this.sqlite = new BetterSqlite3(dbPath);
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA foreign_keys = ON;');
      this.db = drizzleBetterSqlite(this.sqlite, { schema });
    }

    this.media = this.createDelegate('media');
    this.series = this.createDelegate('series');
    this.season = this.createDelegate('season');
    this.episode = this.createDelegate('episode');
    this.movie = this.createDelegate('movie');
    this.mediaFileVariant = this.createDelegate('mediaFileVariant');
    this.variantMissingSubtitle = this.createDelegate('variantMissingSubtitle');
    this.variantAudioTrack = this.createDelegate('variantAudioTrack');
    this.variantSubtitleTrack = this.createDelegate('variantSubtitleTrack');
    this.wantedSubtitle = this.createDelegate('wantedSubtitle');
    this.subtitleHistory = this.createDelegate('subtitleHistory');
    this.qualityProfile = this.createDelegate('qualityProfile');
    this.collection = this.createDelegate('collection');
    this.importList = this.createDelegate('importList');
    this.importListExclusion = this.createDelegate('importListExclusion');
    this.customFilter = this.createDelegate('customFilter');
    this.customFormat = this.createDelegate('customFormat');
    this.customFormatScore = this.createDelegate('customFormatScore');
    this.qualityDefinition = this.createDelegate('qualityDefinition');
    this.indexer = this.createDelegate('indexer');
    this.proxy = this.createDelegate('proxy');
    this.indexerCategory = this.createDelegate('indexerCategory');
    this.indexerRelease = this.createDelegate('indexerRelease');
    this.category = this.createDelegate('category');
    this.torrent = this.createDelegate('torrent');
    this.torrentPeer = this.createDelegate('torrentPeer');
    this.appSettings = this.createDelegate('appSettings');
    this.playbackProgress = this.createDelegate('playbackProgress');
    this.indexerHealthSnapshot = this.createDelegate('indexerHealthSnapshot');
    this.activityEvent = this.createDelegate('activityEvent');
    this.notification = this.createDelegate('notification');
    this.downloadClient = this.createDelegate('downloadClient');
    this.blocklist = this.createDelegate('blocklist');
  }

  async $connect(): Promise<void> {
    // bun:sqlite opens eagerly in constructor; keep Prisma-compatible API surface.
  }

  async $disconnect(): Promise<void> {
    this.sqlite.close();
  }

  async $executeRawUnsafe(query: string, ...params: unknown[]): Promise<number> {
    let result: any;
    if (typeof this.sqlite.query === 'function') {
      result = this.sqlite.query(query).run(...params);
    } else {
      result = this.sqlite.prepare(query).run(...params);
    }
    return Number(result.changes ?? 0);
  }

  async $queryRaw<T = unknown>(query: TemplateStringsArray | string, ...params: unknown[]): Promise<T> {
    let sqlText = '';
    let sqlParams: unknown[] = [];

    if (Array.isArray(query) && 'raw' in query) {
      sqlText = query.reduce((acc, part, idx) => `${acc}${part}${idx < params.length ? '?' : ''}`, '');
      sqlParams = params;
    } else if (typeof query === 'string') {
      sqlText = query;
      sqlParams = params;
    } else {
      throw new Error('Unsupported $queryRaw invocation');
    }

    if (typeof this.sqlite.query === 'function') {
      return this.sqlite.query(sqlText).all(...sqlParams) as T;
    }

    const statement = this.sqlite.prepare(sqlText);
    return statement.all(...sqlParams) as T;
  }

  async $queryRawUnsafe<T = unknown>(query: string, ...params: unknown[]): Promise<T> {
    return this.$queryRaw(query, ...params);
  }

  async $transaction<T>(
    input: Array<Promise<unknown>> | ((tx: this) => Promise<T> | T),
  ): Promise<T | unknown[]> {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    this.sqlite.exec('BEGIN');
    try {
      const result = await input(this);
      this.sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  private createContext(): QueryContext {
    return { rowsCache: new Map<ModelName, Promise<any[]>>() };
  }

  private createDelegate(model: ModelName): AnyRecord {
    return {
      findMany: (args?: QueryArgs) => this.findMany(model, args ?? {}),
      findUnique: (args: QueryArgs) => this.findUnique(model, args),
      findFirst: (args?: QueryArgs) => this.findFirst(model, args ?? {}),
      count: (args?: QueryArgs) => this.count(model, args ?? {}),
      create: (args: { data: AnyRecord } & QueryArgs) => this.create(model, args),
      createMany: (args: { data: AnyRecord[] }) => this.createMany(model, args),
      update: (args: { where: AnyRecord; data: AnyRecord } & QueryArgs) => this.update(model, args),
      updateMany: (args: { where?: AnyRecord; data: AnyRecord }) => this.updateMany(model, args),
      delete: (args: { where: AnyRecord } & QueryArgs) => this.delete(model, args),
      deleteMany: (args?: { where?: AnyRecord }) => this.deleteMany(model, args ?? {}),
      upsert: (args: { where: AnyRecord; create: AnyRecord; update: AnyRecord } & QueryArgs) => this.upsert(model, args),
    };
  }

  private async getRows(model: ModelName, ctx: QueryContext): Promise<any[]> {
    const cached = ctx.rowsCache.get(model);
    if (cached) {
      return cached;
    }

    const config = MODEL_CONFIG[model];
    const loader = Promise.resolve(this.db.select().from(config.table as any)).then((rows) =>
      (rows as any[]).map((row) => ({ ...row })),
    );
    ctx.rowsCache.set(model, loader);
    return loader;
  }

  private async findMany(model: ModelName, args: QueryArgs, ctx: QueryContext = this.createContext()): Promise<any[]> {
    const where = normalizeWhereObject(args.where) as AnyRecord | undefined;
    let rows = await this.getRows(model, ctx);

    if (where) {
      rows = await this.filterRows(model, rows, where, ctx);
    }

    rows = this.sortRows(rows, args.orderBy);

    if (typeof args.skip === 'number' && args.skip > 0) {
      rows = rows.slice(args.skip);
    }

    if (typeof args.take === 'number') {
      const take = Math.max(0, args.take);
      rows = rows.slice(0, take);
    }

    const output: any[] = [];
    for (const row of rows) {
      output.push(await this.applySelection(model, row, args, ctx));
    }
    return output;
  }

  private async findUnique(model: ModelName, args: QueryArgs, ctx: QueryContext = this.createContext()): Promise<any> {
    const rows = await this.findMany(model, { ...args, take: 1 }, ctx);
    return rows[0] ?? null;
  }

  private async findFirst(model: ModelName, args: QueryArgs, ctx: QueryContext = this.createContext()): Promise<any> {
    const rows = await this.findMany(model, { ...args, take: 1 }, ctx);
    return rows[0] ?? null;
  }

  private async count(model: ModelName, args: QueryArgs, ctx: QueryContext = this.createContext()): Promise<number> {
    const rows = await this.findMany(model, { ...args, select: undefined, include: undefined }, ctx);
    return rows.length;
  }

  private async create(
    model: ModelName,
    args: { data: AnyRecord } & QueryArgs,
    ctx: QueryContext = this.createContext(),
  ): Promise<any> {
    const config = MODEL_CONFIG[model];
    const { data: rawData, nestedManyCreates } = this.extractNestedManyCreates(model, args.data);
    const data = this.normalizeWriteData(model, rawData);
    const inserted = await this.db.insert(config.table as any).values(data as any).returning();
    const created = inserted?.[0] ?? null;

    if (!created) {
      return this.findFirst(model, { where: this.extractSimpleWhere(args.data), ...args }, ctx);
    }

    await this.applyNestedManyCreates(model, created, nestedManyCreates);

    return this.findUnique(
      model,
      {
        where: { [config.primaryKey]: created[config.primaryKey] },
        select: args.select,
        include: args.include,
      },
      this.createContext(),
    );
  }

  private async createMany(
    model: ModelName,
    args: { data: AnyRecord[] },
  ): Promise<{ count: number }> {
    const config = MODEL_CONFIG[model];
    const rows = args.data ?? [];
    if (rows.length === 0) {
      return { count: 0 };
    }
    await this.db.insert(config.table as any).values(rows.map((row) => this.normalizeWriteData(model, row)) as any);
    return { count: rows.length };
  }

  private async update(
    model: ModelName,
    args: { where: AnyRecord; data: AnyRecord } & QueryArgs,
  ): Promise<any> {
    const config = MODEL_CONFIG[model];
    const existing = await this.findUnique(model, { where: args.where });
    if (!existing) {
      throw new Error(`${model}.update failed: record not found`);
    }

    const updateData = this.resolveUpdateData(model, args.data, existing);
    if (Object.keys(updateData).length > 0) {
      await this.db
        .update(config.table as any)
        .set(updateData as any)
        .where(eq((config.table as any)[config.primaryKey], existing[config.primaryKey]));
    }

    return this.findUnique(model, {
      where: { [config.primaryKey]: existing[config.primaryKey] },
      select: args.select,
      include: args.include,
    });
  }

  private async updateMany(
    model: ModelName,
    args: { where?: AnyRecord; data: AnyRecord },
  ): Promise<{ count: number }> {
    const config = MODEL_CONFIG[model];
    const rows = await this.findMany(model, { where: args.where, select: { [config.primaryKey]: true } });
    let updatedCount = 0;
    for (const row of rows) {
      const updateData = this.resolveUpdateData(model, args.data, row);
      if (Object.keys(updateData).length === 0) {
        continue;
      }
      await this.db
        .update(config.table as any)
        .set(updateData as any)
        .where(eq((config.table as any)[config.primaryKey], row[config.primaryKey]));
      updatedCount += 1;
    }

    return { count: updatedCount };
  }

  private async delete(
    model: ModelName,
    args: { where: AnyRecord } & QueryArgs,
  ): Promise<any> {
    const config = MODEL_CONFIG[model];
    const existing = await this.findUnique(model, { where: args.where });
    if (!existing) {
      throw new Error(`${model}.delete failed: record not found`);
    }

    await this.db
      .delete(config.table as any)
      .where(eq((config.table as any)[config.primaryKey], existing[config.primaryKey]));

    return existing;
  }

  private async deleteMany(
    model: ModelName,
    args: { where?: AnyRecord },
  ): Promise<{ count: number }> {
    const config = MODEL_CONFIG[model];
    const rows = await this.findMany(model, { where: args.where, select: { [config.primaryKey]: true } });
    for (const row of rows) {
      await this.db
        .delete(config.table as any)
        .where(eq((config.table as any)[config.primaryKey], row[config.primaryKey]));
    }
    return { count: rows.length };
  }

  private async upsert(
    model: ModelName,
    args: { where: AnyRecord; create: AnyRecord; update: AnyRecord } & QueryArgs,
  ): Promise<any> {
    const existing = await this.findUnique(model, { where: args.where });
    if (existing) {
      return this.update(model, {
        where: args.where,
        data: args.update,
        select: args.select,
        include: args.include,
      });
    }

    const fromWhere = this.extractSimpleWhere(args.where);
    return this.create(model, {
      data: { ...fromWhere, ...args.create },
      select: args.select,
      include: args.include,
    });
  }

  private extractSimpleWhere(where: AnyRecord | undefined): AnyRecord {
    if (!where) {
      return {};
    }
    const normalized = normalizeWhereObject(where) as AnyRecord;
    const out: AnyRecord = {};
    for (const [key, value] of Object.entries(normalized)) {
      if (FILTER_OPERATOR_KEYS.has(key) || key === 'AND' || key === 'OR' || key === 'NOT') {
        continue;
      }
      if (isPlainObject(value)) {
        if ('equals' in value && Object.keys(value).length === 1) {
          out[key] = value.equals;
        }
        continue;
      }
      out[key] = value;
    }
    return out;
  }

  private normalizeWriteData(model: ModelName, input: AnyRecord): AnyRecord {
    const config = MODEL_CONFIG[model];
    const data: AnyRecord = { ...input };

    for (const [relationName, relation] of Object.entries(config.relations)) {
      if (relation.kind !== 'one' || !relation.sourceField || !(relationName in data)) {
        continue;
      }

      const relationValue = data[relationName];
      delete data[relationName];

      if (!isPlainObject(relationValue)) {
        continue;
      }

      if (relationValue.disconnect === true || relationValue.set === null) {
        data[relation.sourceField] = null;
        continue;
      }

      const connect = relationValue.connect;
      if (isPlainObject(connect) && connect.id !== undefined) {
        data[relation.sourceField] = connect.id;
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        delete data[key];
      }
    }

    return data;
  }

  private resolveUpdateData(model: ModelName, input: AnyRecord, existing: AnyRecord): AnyRecord {
    const normalized = this.normalizeWriteData(model, input);
    const out: AnyRecord = {};

    for (const [key, rawValue] of Object.entries(normalized)) {
      if (!isPlainObject(rawValue)) {
        out[key] = rawValue;
        continue;
      }

      const hasOps = 'set' in rawValue || 'increment' in rawValue || 'decrement' in rawValue || 'multiply' in rawValue || 'divide' in rawValue;
      if (!hasOps) {
        out[key] = rawValue;
        continue;
      }

      const currentValue = existing[key];
      if ('set' in rawValue) {
        out[key] = rawValue.set;
        continue;
      }

      if (typeof currentValue === 'bigint') {
        let next = currentValue;
        if ('increment' in rawValue) next += BigInt(rawValue.increment ?? 0);
        if ('decrement' in rawValue) next -= BigInt(rawValue.decrement ?? 0);
        if ('multiply' in rawValue) next *= BigInt(rawValue.multiply ?? 1);
        if ('divide' in rawValue) next /= BigInt(rawValue.divide ?? 1);
        out[key] = next;
        continue;
      }

      let next = Number(currentValue ?? 0);
      if ('increment' in rawValue) next += Number(rawValue.increment ?? 0);
      if ('decrement' in rawValue) next -= Number(rawValue.decrement ?? 0);
      if ('multiply' in rawValue) next *= Number(rawValue.multiply ?? 1);
      if ('divide' in rawValue) next /= Number(rawValue.divide ?? 1);
      out[key] = next;
    }

    return out;
  }

  private extractNestedManyCreates(
    model: ModelName,
    input: AnyRecord,
  ): { data: AnyRecord; nestedManyCreates: Array<{ relation: RelationConfig; rows: AnyRecord[] }> } {
    const data: AnyRecord = { ...input };
    const nestedManyCreates: Array<{ relation: RelationConfig; rows: AnyRecord[] }> = [];
    const relations = MODEL_CONFIG[model].relations;

    for (const [relationName, relation] of Object.entries(relations)) {
      if (relation.kind !== 'many' || !(relationName in data)) {
        continue;
      }

      const relationValue = data[relationName];
      delete data[relationName];
      if (!isPlainObject(relationValue)) {
        continue;
      }

      const rows: AnyRecord[] = [];
      if (Array.isArray(relationValue.create)) {
        rows.push(...relationValue.create.filter(isPlainObject));
      } else if (isPlainObject(relationValue.create)) {
        rows.push(relationValue.create);
      }

      if (isPlainObject(relationValue.createMany) && Array.isArray(relationValue.createMany.data)) {
        rows.push(...relationValue.createMany.data.filter(isPlainObject));
      }

      if (rows.length > 0) {
        nestedManyCreates.push({ relation, rows });
      }
    }

    return { data, nestedManyCreates };
  }

  private async applyNestedManyCreates(
    model: ModelName,
    createdParent: AnyRecord,
    nestedManyCreates: Array<{ relation: RelationConfig; rows: AnyRecord[] }>,
  ): Promise<void> {
    if (nestedManyCreates.length === 0) {
      return;
    }

    const parentConfig = MODEL_CONFIG[model];
    const parentId = createdParent[parentConfig.primaryKey];

    for (const entry of nestedManyCreates) {
      const childModel = entry.relation.model;
      const childConfig = MODEL_CONFIG[childModel];
      const childRows = entry.rows.map((row) =>
        this.normalizeWriteData(childModel, {
          ...row,
          [entry.relation.targetField]: parentId,
        }),
      );

      if (childRows.length === 0) {
        continue;
      }

      await this.db.insert(childConfig.table as any).values(childRows as any);
    }
  }

  private async filterRows(
    model: ModelName,
    rows: any[],
    where: AnyRecord,
    ctx: QueryContext,
  ): Promise<any[]> {
    const filtered: any[] = [];
    for (const row of rows) {
      if (await this.matchesWhere(model, row, where, ctx)) {
        filtered.push(row);
      }
    }
    return filtered;
  }

  private async matchesWhere(
    model: ModelName,
    row: AnyRecord,
    where: AnyRecord | undefined,
    ctx: QueryContext,
  ): Promise<boolean> {
    if (!where || Object.keys(where).length === 0) {
      return true;
    }

    const config = MODEL_CONFIG[model];
    const normalizedWhere = normalizeWhereObject(where) as AnyRecord;

    for (const [key, value] of Object.entries(normalizedWhere)) {
      if (key === 'AND') {
        const clauses = Array.isArray(value) ? value : [value];
        for (const clause of clauses) {
          if (!(await this.matchesWhere(model, row, clause as AnyRecord, ctx))) {
            return false;
          }
        }
        continue;
      }

      if (key === 'OR') {
        const clauses = Array.isArray(value) ? value : [value];
        let any = false;
        for (const clause of clauses) {
          if (await this.matchesWhere(model, row, clause as AnyRecord, ctx)) {
            any = true;
            break;
          }
        }
        if (!any) {
          return false;
        }
        continue;
      }

      if (key === 'NOT') {
        const clauses = Array.isArray(value) ? value : [value];
        for (const clause of clauses) {
          if (await this.matchesWhere(model, row, clause as AnyRecord, ctx)) {
            return false;
          }
        }
        continue;
      }

      const relation = config.relations[key];
      if (relation) {
        const relationMatch = await this.matchesRelation(model, row, relation, value, ctx);
        if (!relationMatch) {
          return false;
        }
        continue;
      }

      const fieldMatch = this.matchesField(row[key], value);
      if (!fieldMatch) {
        return false;
      }
    }

    return true;
  }

  private matchesField(actualValue: unknown, condition: unknown): boolean {
    if (isPlainObject(condition)) {
      const mode = condition.mode === 'insensitive' ? 'insensitive' : 'default';
      for (const [operator, expectedRaw] of Object.entries(condition)) {
        if (operator === 'mode') {
          continue;
        }
        if (operator === 'equals' && !scalarEqual(actualValue, expectedRaw)) return false;
        if (operator === 'in') {
          const values = Array.isArray(expectedRaw) ? expectedRaw : [];
          if (!values.some((v) => scalarEqual(actualValue, v))) return false;
        }
        if (operator === 'notIn') {
          const values = Array.isArray(expectedRaw) ? expectedRaw : [];
          if (values.some((v) => scalarEqual(actualValue, v))) return false;
        }
        if (operator === 'gt' && !(compareValues(actualValue, expectedRaw) > 0)) return false;
        if (operator === 'gte' && !(compareValues(actualValue, expectedRaw) >= 0)) return false;
        if (operator === 'lt' && !(compareValues(actualValue, expectedRaw) < 0)) return false;
        if (operator === 'lte' && !(compareValues(actualValue, expectedRaw) <= 0)) return false;
        if (operator === 'contains') {
          const source = String(actualValue ?? '');
          const needle = String(expectedRaw ?? '');
          if (mode === 'insensitive') {
            if (!source.toLowerCase().includes(needle.toLowerCase())) return false;
          } else if (!source.includes(needle)) {
            return false;
          }
        }
        if (operator === 'startsWith') {
          const source = String(actualValue ?? '');
          const needle = String(expectedRaw ?? '');
          if (mode === 'insensitive') {
            if (!source.toLowerCase().startsWith(needle.toLowerCase())) return false;
          } else if (!source.startsWith(needle)) {
            return false;
          }
        }
        if (operator === 'endsWith') {
          const source = String(actualValue ?? '');
          const needle = String(expectedRaw ?? '');
          if (mode === 'insensitive') {
            if (!source.toLowerCase().endsWith(needle.toLowerCase())) return false;
          } else if (!source.endsWith(needle)) {
            return false;
          }
        }
        if (operator === 'not' && this.matchesField(actualValue, expectedRaw)) return false;
      }
      return true;
    }

    if (condition === null) {
      return actualValue === null;
    }

    return scalarEqual(actualValue, condition);
  }

  private async matchesRelation(
    sourceModel: ModelName,
    sourceRow: AnyRecord,
    relation: RelationConfig,
    condition: unknown,
    ctx: QueryContext,
  ): Promise<boolean> {
    if (relation.kind === 'one') {
      const related = await this.resolveOneRelation(sourceModel, sourceRow, relation, ctx);
      if (condition === null) {
        return related === null;
      }
      if (!isPlainObject(condition)) {
        return related !== null;
      }

      if ('is' in condition) {
        const relationWhere = condition.is as AnyRecord | null;
        if (relationWhere === null) {
          return related === null;
        }
        return related !== null && this.matchesWhere(relation.model, related, relationWhere, ctx);
      }

      if ('isNot' in condition) {
        const relationWhere = condition.isNot as AnyRecord | null;
        if (relationWhere === null) {
          return related !== null;
        }
        return !(related !== null && await this.matchesWhere(relation.model, related, relationWhere, ctx));
      }

      return related !== null && this.matchesWhere(relation.model, related, condition as AnyRecord, ctx);
    }

    const relatedRows = await this.resolveManyRelation(sourceModel, sourceRow, relation, ctx);
    if (!isPlainObject(condition)) {
      return relatedRows.length > 0;
    }

    if ('some' in condition) {
      const relationWhere = condition.some as AnyRecord | undefined;
      if (!relationWhere || Object.keys(relationWhere).length === 0) {
        if (relatedRows.length === 0) return false;
      } else {
        let matched = false;
        for (const row of relatedRows) {
          if (await this.matchesWhere(relation.model, row, relationWhere, ctx)) {
            matched = true;
            break;
          }
        }
        if (!matched) return false;
      }
    }

    if ('none' in condition) {
      const relationWhere = condition.none as AnyRecord | undefined;
      if (!relationWhere || Object.keys(relationWhere).length === 0) {
        if (relatedRows.length > 0) return false;
      } else {
        for (const row of relatedRows) {
          if (await this.matchesWhere(relation.model, row, relationWhere, ctx)) {
            return false;
          }
        }
      }
    }

    if ('every' in condition) {
      const relationWhere = condition.every as AnyRecord | undefined;
      if (relationWhere && Object.keys(relationWhere).length > 0) {
        for (const row of relatedRows) {
          if (!(await this.matchesWhere(relation.model, row, relationWhere, ctx))) {
            return false;
          }
        }
      }
    }

    if (!('some' in condition) && !('none' in condition) && !('every' in condition)) {
      for (const row of relatedRows) {
        if (await this.matchesWhere(relation.model, row, condition as AnyRecord, ctx)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  private sortRows(rows: any[], orderBy: QueryArgs['orderBy']): any[] {
    if (!orderBy) {
      return [...rows];
    }
    const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
    const normalized: Array<{ field: string; direction: SortDirection }> = [];
    for (const spec of specs) {
      if (!isPlainObject(spec)) continue;
      for (const [field, dir] of Object.entries(spec)) {
        normalized.push({ field, direction: (dir === 'desc' ? 'desc' : 'asc') });
      }
    }

    return [...rows].sort((left, right) => {
      for (const { field, direction } of normalized) {
        const result = compareValues(left[field], right[field]);
        if (result !== 0) {
          return direction === 'asc' ? result : -result;
        }
      }
      return 0;
    });
  }

  private async applySelection(
    model: ModelName,
    row: AnyRecord,
    args: QueryArgs,
    ctx: QueryContext,
  ): Promise<AnyRecord> {
    const result: AnyRecord = {};
    const hasSelect = isPlainObject(args.select);

    if (hasSelect) {
      for (const [key, value] of Object.entries(args.select ?? {})) {
        if (value === true) {
          result[key] = row[key];
          continue;
        }
        const relation = MODEL_CONFIG[model].relations[key];
        if (relation) {
          result[key] = await this.resolveRelationValue(model, row, key, value as AnyRecord, ctx);
        }
      }
    } else {
      Object.assign(result, row);
    }

    if (isPlainObject(args.include)) {
      for (const [key, value] of Object.entries(args.include)) {
        result[key] = await this.resolveRelationValue(model, row, key, value as AnyRecord, ctx);
      }
    }

    return result;
  }

  private async resolveRelationValue(
    model: ModelName,
    row: AnyRecord,
    relationName: string,
    relationArgs: AnyRecord | boolean,
    ctx: QueryContext,
  ): Promise<any> {
    const relation = MODEL_CONFIG[model].relations[relationName];
    if (!relation) {
      return undefined;
    }

    if (relation.kind === 'one') {
      const related = await this.resolveOneRelation(model, row, relation, ctx);
      if (!related) {
        return null;
      }
      if (relationArgs === true) {
        return { ...related };
      }
      const nestedArgs: QueryArgs = isPlainObject(relationArgs) ? relationArgs : {};
      if (isPlainObject(nestedArgs.where) && !(await this.matchesWhere(relation.model, related, nestedArgs.where, ctx))) {
        return null;
      }
      return this.applySelection(relation.model, related, nestedArgs, ctx);
    }

    let relatedRows = await this.resolveManyRelation(model, row, relation, ctx);
    const nestedArgs: QueryArgs = relationArgs === true
      ? {}
      : (isPlainObject(relationArgs) ? relationArgs : {});
    if (isPlainObject(nestedArgs.where)) {
      relatedRows = await this.filterRows(relation.model, relatedRows, nestedArgs.where, ctx);
    }
    relatedRows = this.sortRows(relatedRows, nestedArgs.orderBy);
    if (typeof nestedArgs.skip === 'number' && nestedArgs.skip > 0) {
      relatedRows = relatedRows.slice(nestedArgs.skip);
    }
    if (typeof nestedArgs.take === 'number') {
      relatedRows = relatedRows.slice(0, Math.max(0, nestedArgs.take));
    }

    const output: any[] = [];
    for (const relatedRow of relatedRows) {
      output.push(
        relationArgs === true
          ? { ...relatedRow }
          : await this.applySelection(relation.model, relatedRow, nestedArgs, ctx),
      );
    }
    return output;
  }

  private async resolveOneRelation(
    sourceModel: ModelName,
    sourceRow: AnyRecord,
    relation: RelationConfig,
    ctx: QueryContext,
  ): Promise<AnyRecord | null> {
    const sourceConfig = MODEL_CONFIG[sourceModel];
    const targetRows = await this.getRows(relation.model, ctx);

    if (relation.sourceField) {
      const foreignKeyValue = sourceRow[relation.sourceField];
      if (foreignKeyValue === null || foreignKeyValue === undefined) {
        return null;
      }
      return targetRows.find((row) => scalarEqual(row[relation.targetField], foreignKeyValue)) ?? null;
    }

    const sourceId = sourceRow[sourceConfig.primaryKey];
    return targetRows.find((row) => scalarEqual(row[relation.targetField], sourceId)) ?? null;
  }

  private async resolveManyRelation(
    sourceModel: ModelName,
    sourceRow: AnyRecord,
    relation: RelationConfig,
    ctx: QueryContext,
  ): Promise<AnyRecord[]> {
    const sourceConfig = MODEL_CONFIG[sourceModel];
    const sourceId = sourceRow[sourceConfig.primaryKey];
    const targetRows = await this.getRows(relation.model, ctx);
    return targetRows.filter((row) => scalarEqual(row[relation.targetField], sourceId));
  }
}
