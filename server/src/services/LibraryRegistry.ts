/**
 * Library registry seeding (track feature_adult_library_20261107, gate G10).
 *
 * `Library` rows are containers — kind + root + options — seeded from the existing settings so the
 * Adult library (and later YouTube/Music) have somewhere to live without changing how movies and TV
 * are queried. Seeding is idempotent: it creates missing rows, updates roots, and never deletes a
 * library.
 */
export type LibraryKind = 'MOVIES' | 'TV' | 'ADULT' | 'YOUTUBE' | 'MUSIC';

export interface LibrarySeedSettings {
  movieRootFolder: string;
  tvRootFolder: string;
  adultRootFolder: string;
}

export interface LibraryRow {
  id: number;
  kind: string;
  name: string;
  rootFolder: string;
  enabled: boolean;
}

export interface LibraryRegistryDatabase {
  library: {
    findMany(): Promise<LibraryRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<LibraryRow>;
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<unknown>;
  };
}

const DEFINITIONS: Array<{ kind: LibraryKind; name: string; rootOf: (settings: LibrarySeedSettings) => string }> = [
  { kind: 'MOVIES', name: 'Movies', rootOf: (settings) => settings.movieRootFolder },
  { kind: 'TV', name: 'TV Shows', rootOf: (settings) => settings.tvRootFolder },
  { kind: 'ADULT', name: 'Adult', rootOf: (settings) => settings.adultRootFolder },
];

/** Create missing libraries and refresh roots; enabled = root is configured. */
export async function ensureLibraryRegistry(
  db: LibraryRegistryDatabase,
  settings: LibrarySeedSettings,
): Promise<LibraryRow[]> {
  const existing = await db.library.findMany();
  const byKind = new Map(existing.map((row) => [row.kind, row]));

  for (const definition of DEFINITIONS) {
    const root = definition.rootOf(settings).trim();
    const enabled = root.length > 0 && definition.kind !== 'ADULT'
      ? root.length > 0
      : root.length > 0;
    const current = byKind.get(definition.kind);
    if (current === undefined) {
      await db.library.create({
        data: { kind: definition.kind, name: definition.name, rootFolder: root, enabled },
      });
      continue;
    }
    if (current.rootFolder !== root || current.enabled !== enabled) {
      await db.library.update({ where: { id: current.id }, data: { rootFolder: root, enabled } });
    }
  }

  return db.library.findMany();
}
